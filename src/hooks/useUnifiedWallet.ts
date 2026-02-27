'use client';

import { useChainStore } from '@/stores/chainStore';
import { CHAIN_REGISTRY } from '@/lib/chains/registry';
import { useCosmosWallet } from './useCosmosWallet';
import { useEvmWallet } from './useEvmWallet';
import type { WalletState } from './useCosmosWallet';

const useUnifiedWallet = (): WalletState => {
  const selectedChainSlug = useChainStore((state) => state.selectedChainSlug);
  const config = CHAIN_REGISTRY[selectedChainSlug]!;

  // Both hooks must always be called (React hooks rules)
  const cosmosWallet = useCosmosWallet(config);
  const evmWallet = useEvmWallet();

  if (config.type === 'evm') {
    return evmWallet;
  }

  return cosmosWallet;
};

export { useUnifiedWallet };
