'use client';

import { useQuery } from '@tanstack/react-query';
import { useChainStore } from '@/stores/chainStore';
import { CHAIN_REGISTRY } from '@/lib/chains/registry';
import { queryKeys } from '@/lib/queryKeys';

const useStakingApy = () => {
  const selectedChainSlug = useChainStore((state) => state.selectedChainSlug);
  const chainConfig = CHAIN_REGISTRY[selectedChainSlug];

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.stakingApy(selectedChainSlug),
    queryFn: () => chainConfig!.fetchApy(chainConfig!),
    enabled: !!chainConfig,
    staleTime: 5 * 60 * 1000,
  });

  return {
    apy: data ?? null,
    isLoading,
  };
};

export { useStakingApy };
