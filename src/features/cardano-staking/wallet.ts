'use client';
import { create } from 'zustand';
import type { BrowserWallet } from '@meshsdk/wallet';
import { useWalletTypeStore } from '@/stores/walletTypeStore';
type Connection = { wallet: BrowserWallet; address: string; stakeAddress: string };
export const useCardanoWallet = create<{ connection: Connection | null }>(() => ({ connection: null }));
export async function connectCardanoWallet(name: 'lace' | 'eternl') {
  const { BrowserWallet } = await import('@meshsdk/wallet');
  if (!BrowserWallet.getInstalledWallets().some((item) => item.name.toLowerCase() === name)) throw new Error(`${name === 'lace' ? 'Lace' : 'Eternl'} 지갑을 설치하거나 지갑 내 브라우저에서 열어 주세요.`);
  const wallet = await BrowserWallet.enable(name);
  const [network, address, stakes] = await Promise.all([wallet.getNetworkId(), wallet.getChangeAddress(), wallet.getRewardAddresses()]);
  if (network !== 1 || !address.startsWith('addr1') || !stakes[0]?.startsWith('stake1')) throw new Error('Cardano 메인넷 계정과 스테이크 주소가 필요합니다.');
  useCardanoWallet.setState({ connection: { wallet, address, stakeAddress: stakes[0] } });
  useWalletTypeStore.getState().setWalletType('cardano');
}
export function disconnectCardanoWallet() { useCardanoWallet.setState({ connection: null }); }
export async function checkCardanoAccount(connection: Connection) {
  const [network, address, stakes] = await Promise.all([connection.wallet.getNetworkId(), connection.wallet.getChangeAddress(), connection.wallet.getRewardAddresses()]);
  if (network !== 1 || address !== connection.address || stakes[0] !== connection.stakeAddress || useCardanoWallet.getState().connection !== connection) {
    disconnectCardanoWallet();
    throw new Error('Cardano 지갑 계정이나 네트워크가 변경되었습니다. 다시 연결하세요.');
  }
}
