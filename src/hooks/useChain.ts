'use client';

import { useMemo } from 'react';
import { useChainStore } from '@/stores/chainStore';
import { CHAIN_REGISTRY } from '@/lib/chains/registry';
import { createXplaAdapter } from '@/lib/chains/xpla/adapter';
import { createXplaClient } from '@/lib/chains/xpla/client';
import { useWalletInfo } from './useWalletInfo';
import type { StakingAdapter } from '@/lib/chains/adapter';
import type { ChainConfig } from '@/lib/chains/types';

const useChain = (): { config: ChainConfig; adapter: StakingAdapter } => {
  const selectedChainSlug = useChainStore((state) => state.selectedChainSlug);
  const { walletAddress } = useWalletInfo();

  const config = CHAIN_REGISTRY[selectedChainSlug]!;

  // Registry id is already the actual chain ID (e.g. dimension_37-1, cube_47-5)
  const adapter = useMemo(() => {
    if (config.type === 'cosmos') {
      const client = createXplaClient(config.lcd, config.id);
      // Pass empty string for senderAddress when wallet is not connected
      // Build*Msg methods won't be called without a connected wallet anyway
      return createXplaAdapter(config, client, walletAddress ?? '');
    }
    throw new Error(`Unsupported chain type: ${config.type}`);
  }, [config, walletAddress]);

  return { config, adapter };
};

export { useChain };
