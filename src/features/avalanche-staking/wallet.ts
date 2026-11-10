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
  if (typeof result !== 'string' || !/^[1-9A-HJ-NP-Za-km-z]{40,60}$/.test(result)) throw new Error('Invalid transaction ID from the Avalanche wallet.');
  return result;
}
async function coreAddress(provider: Provider) {
  if (await provider.request({ method: 'eth_chainId' }) !== '0xa86a') throw new Error('Select Avalanche mainnet in Core.');
  const keys = await provider.request({ method: 'avalanche_getAccountPubKey' });
  if (!keys || typeof keys !== 'object' || !('xp' in keys) || typeof keys.xp !== 'string') throw new Error('Could not fetch the Core P-Chain public key.');
  return validatePAddress(`P-${utils.formatBech32('avax', secp256k1.publicKeyBytesToAddress(utils.hexToBuffer(keys.xp)))}`);
}
export async function connectAvalancheWallet(kind: 'core' | 'ledger' | 'walletconnect') {
  let connection: Connection;
  if (kind === 'ledger') {
    connection = await (await import('./ledger')).connectAvalancheLedger();
  } else if (kind === 'core') {
    const provider = (window as Window & { avalanche?: Provider }).avalanche;
    if (!provider) throw new Error('Install the Core wallet extension.');
    await provider.request({ method: 'eth_requestAccounts' });
    const address = await coreAddress(provider);
    connection = { address, disconnect: async () => {}, send: async (transaction) => {
      if (await coreAddress(provider) !== address) throw new Error('The Core account has changed. Reconnect your wallet.');
      return transactionId(await provider.request({ method: 'avalanche_sendTransaction', params: transactionParams(transaction) }));
    } };
  } else {
    if (!WALLET_CONNECT_PROJECT_ID) throw new Error('A WalletConnect project ID is required.');
    const client = await SignClient.init({ projectId: WALLET_CONNECT_PROJECT_ID, customStoragePrefix: 'orbis-avalanche', metadata: { name: 'Orbis', description: 'Avalanche P-Chain staking', url: window.location.origin, icons: [`${window.location.origin}/chains/avalanche.png`] } });
    client.on('session_delete', clear); client.on('session_update', clear); client.on('session_expire', clear); client.on('session_event', clear);
    const { uri, approval } = await client.connect({ requiredNamespaces: { avax: { chains: [CHAIN], methods: ['avalanche_sendTransaction'], events: ['accountsChanged', 'chainChanged'] } } });
    useAvalancheWallet.setState({ uri: uri ?? null });
    try {
      const session = await approval();
      const account = session.namespaces.avax?.accounts.find((value) => value.startsWith(`${CHAIN}:`));
      if (!account || !session.namespaces.avax.methods.includes('avalanche_sendTransaction')) throw new Error('Select a Core wallet that supports the P-Chain.');
      const raw = account.slice(CHAIN.length + 1);
      const address = validatePAddress(raw.startsWith('P-') ? raw : `P-${raw}`);
      connection = { address, disconnect: () => client.disconnect({ topic: session.topic, reason: { code: 6000, message: 'User disconnected' } }), send: async (transaction) => {
        if (!client.session.get(session.topic).namespaces.avax?.accounts.includes(account)) throw new Error('The WalletConnect account has changed.');
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
