'use client';
import { create } from 'zustand';
import type { BrowserWallet } from '@meshsdk/wallet';
import { useWalletTypeStore } from '@/stores/walletTypeStore';
type Connection = { wallet: BrowserWallet; address: string; stakeAddress: string };
export const useCardanoWallet = create<{ connection: Connection | null }>(() => ({ connection: null }));
export async function connectCardanoWallet(name: 'lace' | 'eternl') {
  const { BrowserWallet } = await import('@meshsdk/wallet');
  if (!BrowserWallet.getInstalledWallets().some((item) => item.name.toLowerCase() === name)) throw new Error(`${name === 'lace' ? 'Lace' : 'Eternl'} wallet: install the app or open this page in its browser.`);
  const wallet = await BrowserWallet.enable(name);
  const [network, address, stakes] = await Promise.all([wallet.getNetworkId(), wallet.getChangeAddress(), wallet.getRewardAddresses()]);
  if (network !== 1 || !address.startsWith('addr1') || !stakes[0]?.startsWith('stake1')) throw new Error('A Cardano mainnet account and stake address are required.');
  useCardanoWallet.setState({ connection: { wallet, address, stakeAddress: stakes[0] } });
  useWalletTypeStore.getState().setWalletType('cardano');
}
export function disconnectCardanoWallet() { useCardanoWallet.setState({ connection: null }); }
export async function checkCardanoAccount(connection: Connection) {
  const [network, address, stakes] = await Promise.all([connection.wallet.getNetworkId(), connection.wallet.getChangeAddress(), connection.wallet.getRewardAddresses()]);
  if (network !== 1 || address !== connection.address || stakes[0] !== connection.stakeAddress || useCardanoWallet.getState().connection !== connection) {
    disconnectCardanoWallet();
    throw new Error('The Cardano wallet account or network has changed. Reconnect your wallet.');
  }
}
