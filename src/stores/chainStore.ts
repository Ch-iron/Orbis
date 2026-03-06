import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_CHAIN_SLUG } from '@/lib/chains/registry';

type ChainStore = {
  selectedChainSlug: string;
  setSelectedChainSlug: (slug: string) => void;
};

const useChainStore = create<ChainStore>()(
  persist(
    (set) => ({
      selectedChainSlug: DEFAULT_CHAIN_SLUG,
      setSelectedChainSlug: (slug: string) => {
        set({ selectedChainSlug: slug });
      },
    }),
    {
      name: 'orbis-chain',
    },
  ),
);

export { useChainStore };
