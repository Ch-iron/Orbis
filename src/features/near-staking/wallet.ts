'use client';
import { create } from 'zustand';
import type { WalletSelector } from '@near-wallet-selector/core';
export const useNearWallet = create<{ address: string | null; uri: string | null }>(() => ({ address: null, uri: null }));
let selectorPromise: Promise<WalletSelector> | undefined;
export function getNearSelector() {
  if (!selectorPromise) selectorPromise = initialize().catch((cause) => { selectorPromise = undefined; throw cause; });
  return selectorPromise;
}
async function initialize() {
  const [{ setupWalletSelector }, { setupNearSnap }, { setupWalletConnect }] = await Promise.all([import('@near-wallet-selector/core'), import('@near-wallet-selector/near-snap'), import('@near-wallet-selector/wallet-connect')]);
  const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
  const selector = await setupWalletSelector({ network: 'mainnet', modules: [setupNearSnap(), ...(projectId ? [setupWalletConnect({ projectId, metadata: { name: 'Orbis', description: 'NEAR staking', url: window.location.origin, icons: [`${window.location.origin}/chains/near.png`] } })] : [])] });
  selector.store.observable.subscribe((state) => useNearWallet.setState({ address: state.accounts.find((account) => account.active)?.accountId ?? null }));
  selector.on('uriChanged', ({ uri }) => useNearWallet.setState({ uri }));
  selector.on('networkChanged', ({ networkId }) => { if (networkId !== 'mainnet') useNearWallet.setState({ address: null }); });
  return selector;
}
export async function connectNearWallet(id: 'near-snap' | 'wallet-connect') {
  const selector = await getNearSelector();
  const wallet = await selector.wallet(id);
  if (wallet.type !== 'injected' && wallet.type !== 'bridge') throw new Error('Unsupported NEAR wallet type.');
  try { const accounts = await wallet.signIn({}); if (!accounts.length) throw new Error('Select a NEAR account.'); }
  finally { useNearWallet.setState({ uri: null }); }
}
export async function disconnectNearWallet() {
  const selector = await getNearSelector();
  if (selector.isSignedIn()) await (await selector.wallet()).signOut();
  useNearWallet.setState({ address: null, uri: null });
}
