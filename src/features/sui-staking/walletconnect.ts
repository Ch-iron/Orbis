import SignClient from '@walletconnect/sign-client';
import { create } from 'zustand';
import { isValidSuiAddress, normalizeSuiAddress } from '@mysten/sui/utils';
import { WALLET_CONNECT_PROJECT_ID } from '@/lib/wallet/constants';

type Connection = { topic: string; address: string };
export const useSuiWalletConnect = create<{ connection: Connection | null; uri: string | null }>(() => ({ connection: null, uri: null }));
let initializing: Promise<SignClient> | undefined;

async function getClient() {
  if (!WALLET_CONNECT_PROJECT_ID) throw new Error('WalletConnect 프로젝트 ID가 설정되지 않았습니다.');
  if (!initializing) initializing = SignClient.init({ projectId: WALLET_CONNECT_PROJECT_ID, customStoragePrefix: 'orbis-sui', metadata: { name: 'Orbis', description: 'Sui staking', url: window.location.origin, icons: [`${window.location.origin}/chains/sui.svg`] } }).then((client) => {
    const clear = () => useSuiWalletConnect.setState({ connection: null, uri: null });
    client.on('session_delete', clear);
    client.on('session_expire', clear);
    client.on('session_update', clear);
    client.on('session_event', ({ params }) => { if (params.event.name === 'accountsChanged' || params.event.name === 'chainChanged') clear(); });
    return client;
  }).catch((error) => { initializing = undefined; throw error; });
  return initializing;
}

export async function connectSuiWalletConnect() {
  const client = await getClient();
  const { uri, approval } = await client.connect({ requiredNamespaces: { sui: { chains: ['sui:mainnet'], methods: ['sui_signTransaction'], events: ['accountsChanged', 'chainChanged'] } } });
  useSuiWalletConnect.setState({ uri: uri ?? null });
  try {
    const session = await approval();
    const namespace = session.namespaces.sui;
    const account = namespace?.accounts.find((value) => value.startsWith('sui:mainnet:'));
    const address = account?.slice('sui:mainnet:'.length);
    if (!address || !isValidSuiAddress(address) || !namespace.methods.includes('sui_signTransaction')) throw new Error('Sui 메인넷 거래 서명을 지원하는 지갑을 선택하세요.');
    useSuiWalletConnect.setState({ connection: { topic: session.topic, address: normalizeSuiAddress(address) } });
  } finally { useSuiWalletConnect.setState({ uri: null }); }
}

export async function disconnectSuiWalletConnect() {
  const connection = useSuiWalletConnect.getState().connection;
  if (connection) await (await getClient()).disconnect({ topic: connection.topic, reason: { code: 6000, message: 'User disconnected' } });
  useSuiWalletConnect.setState({ connection: null, uri: null });
}

export async function signSuiWalletConnect(owner: string, transaction: string) {
  const connection = useSuiWalletConnect.getState().connection;
  if (!connection || connection.address !== owner) throw new Error('Sui WalletConnect 계정이 변경되었습니다.');
  const client = await getClient();
  const session = client.session.get(connection.topic);
  if (!session.namespaces.sui?.accounts.some((account) => account === `sui:mainnet:${owner}`)) throw new Error('현재 WalletConnect 세션에 이 계정이 없습니다.');
  const result: unknown = await client.request({ topic: connection.topic, chainId: 'sui:mainnet', request: { method: 'sui_signTransaction', params: { transaction, address: owner } } });
  if (!result || typeof result !== 'object' || !('signature' in result) || typeof result.signature !== 'string' || !('transactionBytes' in result) || typeof result.transactionBytes !== 'string') throw new Error('Sui 지갑 서명 응답이 올바르지 않습니다.');
  if (result.transactionBytes !== transaction) throw new Error('지갑이 다른 거래 데이터를 반환했습니다.');
  return { bytes: result.transactionBytes, signature: result.signature };
}
