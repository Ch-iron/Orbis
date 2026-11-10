import SignClient from '@walletconnect/sign-client';
import { create } from 'zustand';
import { isValidSuiAddress, normalizeSuiAddress } from '@mysten/sui/utils';
import { WALLET_CONNECT_PROJECT_ID } from '@/lib/wallet/constants';

type Connection = { topic: string; address: string };
export const useSuiWalletConnect = create<{ connection: Connection | null; uri: string | null }>(() => ({ connection: null, uri: null }));
let initializing: Promise<SignClient> | undefined;

async function getClient() {
  if (!WALLET_CONNECT_PROJECT_ID) throw new Error('The WalletConnect project ID is not configured.');
  if (!initializing) initializing = SignClient.init({ projectId: WALLET_CONNECT_PROJECT_ID, customStoragePrefix: 'orbis-sui', metadata: { name: 'Orbis', description: 'Sui staking', url: window.location.origin, icons: [`${window.location.origin}/chains/sui.png`] } }).then((client) => {
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
    if (!address || !isValidSuiAddress(address) || !namespace.methods.includes('sui_signTransaction')) throw new Error('Select a wallet that supports signing Sui mainnet transactions.');
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
  if (!connection || connection.address !== owner) throw new Error('The Sui WalletConnect account has changed.');
  const client = await getClient();
  const session = client.session.get(connection.topic);
  if (!session.namespaces.sui?.accounts.some((account) => account === `sui:mainnet:${owner}`)) throw new Error('This account is not in the current WalletConnect session.');
  const result: unknown = await client.request({ topic: connection.topic, chainId: 'sui:mainnet', request: { method: 'sui_signTransaction', params: { transaction, address: owner } } });
  if (!result || typeof result !== 'object' || !('signature' in result) || typeof result.signature !== 'string' || !('transactionBytes' in result) || typeof result.transactionBytes !== 'string') throw new Error('Invalid Sui wallet signature response.');
  if (result.transactionBytes !== transaction) throw new Error('The wallet returned different transaction data.');
  return { bytes: result.transactionBytes, signature: result.signature };
}
