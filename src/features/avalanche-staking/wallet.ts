'use client';
import { create } from 'zustand';
import { secp256k1, utils, type UnsignedTx } from '@avalabs/avalanchejs';
import SignClient from '@walletconnect/sign-client';
import { validatePAddress } from '@/lib/chains/avalanche/client';
import { WALLET_CONNECT_PROJECT_ID } from '@/lib/wallet/constants';
import { useWalletTypeStore } from '@/stores/walletTypeStore';

type Connection = { address: string; send: (transaction: UnsignedTx) => Promise<string>; disconnect: () => Promise<void> };
type Provider = { request: (request: { method: string; params?: unknown }) => Promise<unknown> };
export const useAvalancheWallet = create<{ connection: Connection | null; uri: string | null }>(() => ({ connection: null, uri: null }));
const CHAIN = 'avax:Rr9hnPVPxuUvrdCul-vjEsU1zmqKqRDo';
const clear = () => useAvalancheWallet.setState({ connection: null, uri: null });
function transactionParams(transaction: UnsignedTx) {
  return { transactionHex: utils.bufferToHex(transaction.toBytes()), chainAlias: 'P', utxos: transaction.toJSON().utxos, externalIndices: [0], internalIndices: [] };
}
function transactionId(result: unknown) {
  if (typeof result !== 'string' || !/^[1-9A-HJ-NP-Za-km-z]{40,60}$/.test(result)) throw new Error('Avalanche 지갑의 거래 ID가 올바르지 않습니다.');
  return result;
}
async function coreAddress(provider: Provider) {
  if (await provider.request({ method: 'eth_chainId' }) !== '0xa86a') throw new Error('Core에서 Avalanche 메인넷을 선택하세요.');
  const keys = await provider.request({ method: 'avalanche_getAccountPubKey' });
  if (!keys || typeof keys !== 'object' || !('xp' in keys) || typeof keys.xp !== 'string') throw new Error('Core P-Chain 공개키를 조회하지 못했습니다.');
  return validatePAddress(`P-${utils.formatBech32('avax', secp256k1.publicKeyBytesToAddress(utils.hexToBuffer(keys.xp)))}`);
}
export async function connectAvalancheWallet(kind: 'core' | 'ledger' | 'walletconnect') {
  let connection: Connection;
  if (kind === 'ledger') {
    connection = await (await import('./ledger')).connectAvalancheLedger();
  } else if (kind === 'core') {
    const provider = (window as Window & { avalanche?: Provider }).avalanche;
    if (!provider) throw new Error('Core 확장 지갑을 설치하세요.');
    await provider.request({ method: 'eth_requestAccounts' });
    const address = await coreAddress(provider);
    connection = { address, disconnect: async () => {}, send: async (transaction) => {
      if (await coreAddress(provider) !== address) throw new Error('Core 계정이 변경되었습니다. 다시 연결하세요.');
      return transactionId(await provider.request({ method: 'avalanche_sendTransaction', params: transactionParams(transaction) }));
    } };
  } else {
    if (!WALLET_CONNECT_PROJECT_ID) throw new Error('WalletConnect 프로젝트 ID가 필요합니다.');
    const client = await SignClient.init({ projectId: WALLET_CONNECT_PROJECT_ID, customStoragePrefix: 'orbis-avalanche', metadata: { name: 'Orbis', description: 'Avalanche P-Chain staking', url: window.location.origin, icons: [`${window.location.origin}/chains/avalanche.svg`] } });
    client.on('session_delete', clear); client.on('session_update', clear); client.on('session_expire', clear); client.on('session_event', clear);
    const { uri, approval } = await client.connect({ requiredNamespaces: { avax: { chains: [CHAIN], methods: ['avalanche_sendTransaction'], events: ['accountsChanged', 'chainChanged'] } } });
    useAvalancheWallet.setState({ uri: uri ?? null });
    try {
      const session = await approval();
      const account = session.namespaces.avax?.accounts.find((value) => value.startsWith(`${CHAIN}:`));
      if (!account || !session.namespaces.avax.methods.includes('avalanche_sendTransaction')) throw new Error('P-Chain을 지원하는 Core 지갑을 선택하세요.');
      const raw = account.slice(CHAIN.length + 1);
      const address = validatePAddress(raw.startsWith('P-') ? raw : `P-${raw}`);
      connection = { address, disconnect: () => client.disconnect({ topic: session.topic, reason: { code: 6000, message: 'User disconnected' } }), send: async (transaction) => {
        if (!client.session.get(session.topic).namespaces.avax?.accounts.includes(account)) throw new Error('WalletConnect 계정이 변경되었습니다.');
        return transactionId(await client.request({ topic: session.topic, chainId: CHAIN, request: { method: 'avalanche_sendTransaction', params: transactionParams(transaction) } }));
      } };
    } finally { useAvalancheWallet.setState({ uri: null }); }
  }
  useAvalancheWallet.setState({ connection });
  useWalletTypeStore.getState().setWalletType('avalanche');
}
export async function disconnectAvalancheWallet() {
  const connection = useAvalancheWallet.getState().connection;
  clear();
  await connection?.disconnect();
}
