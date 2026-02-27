import { create } from 'zustand';
import { DEFAULT_CHAIN_SLUG } from '@/lib/chains/registry';

type ChainStore = {
  selectedChainSlug: string;
  setSelectedChainSlug: (slug: string) => void;
};

const useChainStore = create<ChainStore>((set) => ({
  selectedChainSlug: DEFAULT_CHAIN_SLUG,
  setSelectedChainSlug: (slug: string) => {
    set({ selectedChainSlug: slug });
  },
}));

export { useChainStore };
export type { ChainStore };
