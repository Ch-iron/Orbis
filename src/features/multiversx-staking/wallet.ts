'use client';
import { create } from 'zustand';
import { Address } from '@multiversx/sdk-core/out/core/address';
import type { Transaction } from '@multiversx/sdk-core/out/core/transaction';
import type { ExtensionProvider } from '@multiversx/sdk-extension-provider';
import type { WalletConnectV2Provider } from '@multiversx/sdk-wallet-connect-provider';
export const useMultiversxWallet = create<{ address: string | null; uri: string | null }>(() => ({ address: null, uri: null }));
let provider: ExtensionProvider | WalletConnectV2Provider | undefined;
export async function connectMultiversxWallet(kind: 'extension' | 'walletconnect') {
  if (provider) await disconnectMultiversxWallet();
  if (kind === 'extension') {
    const { ExtensionProvider } = await import('@multiversx/sdk-extension-provider');
    const extension = ExtensionProvider.getInstance();
    if (!await extension.init()) throw new Error('Install the MultiversX DeFi Wallet extension.');
    await extension.login(); provider = extension;
  } else {
    const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
    if (!projectId) throw new Error('WalletConnect configuration is required.');
    const { WalletConnectV2Provider } = await import('@multiversx/sdk-wallet-connect-provider');
    const wallet = new WalletConnectV2Provider({ onClientLogin: () => {}, onClientLogout: () => useMultiversxWallet.setState({ address: null }), onClientEvent: () => useMultiversxWallet.setState({ address: null }) }, '1', 'wss://relay.walletconnect.com', projectId, { metadata: { name: 'Orbis', description: 'MultiversX staking', url: window.location.origin, icons: [`${window.location.origin}/chains/multiversx.png`] } });
    await wallet.init();
    const { uri, approval } = await wallet.connect();
    useMultiversxWallet.setState({ uri: uri ?? null });
    try { await wallet.login({ approval }); provider = wallet; }
    finally { useMultiversxWallet.setState({ uri: null }); }
  }
  const address = await provider.getAddress(); Address.newFromBech32(address);
  useMultiversxWallet.setState({ address });
}
export async function signMultiversxTransaction(owner: string, transaction: Transaction) {
  const check = async () => { if (!provider || useMultiversxWallet.getState().address !== owner || await provider.getAddress() !== owner) throw new Error('The connected MultiversX account has changed.'); };
  await check();
  const signed = await provider!.signTransaction(transaction);
  await check();
  if (signed.chainID !== '1' || signed.sender.toBech32() !== owner) throw new Error('The signed transaction has a different account or network.');
  return signed;
}
export async function disconnectMultiversxWallet() {
  if (provider) await provider.logout();
  provider = undefined; useMultiversxWallet.setState({ address: null, uri: null });
}
