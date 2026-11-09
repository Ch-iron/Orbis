import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type WalletType = 'avalanche' | 'vechain' | 'cardano' | 'ton' | 'multiversx' | 'near' | 'aptos' | 'sui' | 'iota' | 'algorand' | 'cosmos' | 'native-cosmos' | 'evm' | 'klip' | null;

type WalletTypeStore = {
  walletType: WalletType;
  setWalletType: (walletType: WalletType) => void;
};

const useWalletTypeStore = create<WalletTypeStore>()(
  persist(
    (set) => ({
      walletType: null,
      setWalletType: (walletType: WalletType) => {
        set({ walletType });
      },
    }),
    {
      name: 'orbis-wallet-type',
    },
  ),
);

export { useWalletTypeStore };
export type { WalletType };
