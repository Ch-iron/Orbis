'use client';

import { useMemo } from 'react';
import { useChainStore } from '@/stores/chainStore';
import { CHAIN_REGISTRY } from '@/lib/chains/registry';
import { useWalletInfo } from './useWalletInfo';
import type { StakingAdapter } from '@/lib/chains/adapter';
import type { ChainConfig } from '@/lib/chains/types';

const useChain = (): { config: ChainConfig; adapter: StakingAdapter; evmAddress: string | null } => {
  const selectedChainSlug = useChainStore((state) => state.selectedChainSlug);
  const { walletAddress, evmAddress } = useWalletInfo();

  const config = CHAIN_REGISTRY[selectedChainSlug];

  if (!config) {
    throw new Error(`Chain config not found for slug: ${selectedChainSlug}`);
  }

  const adapter = useMemo(
    () => config.createAdapter(config, walletAddress ?? '', evmAddress ?? ''),
    [config, walletAddress, evmAddress],
  );

  return { config, adapter, evmAddress };
};

export { useChain };
