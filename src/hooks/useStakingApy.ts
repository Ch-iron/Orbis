'use client';

import { useQuery } from '@tanstack/react-query';
import { useChainStore } from '@/stores/chainStore';
import { CHAIN_REGISTRY } from '@/lib/chains/registry';
import { queryKeys } from '@/lib/queryKeys';

type StakingReturnEntry = {
  datetime: string;
  annualizedReturn: string;
};

const fetchStakingApy = async (endpoint: string): Promise<number> => {
  const response = await fetch(endpoint).catch(() => null);

  if (!response?.ok) {
    throw new Error('Failed to fetch staking APY');
  }

  const data: StakingReturnEntry[] | null = await response.json().catch(() => null);

  if (!data) {
    throw new Error('Failed to parse staking APY response');
  }

  if (data.length === 0) {
    throw new Error('Empty staking return data');
  }

  const lastEntry = data[data.length - 1];
  return parseFloat(lastEntry.annualizedReturn);
};

const useStakingApy = () => {
  const selectedChainSlug = useChainStore((state) => state.selectedChainSlug);
  const chainConfig = CHAIN_REGISTRY[selectedChainSlug];
  const endpoint = chainConfig?.stakingApyEndpoint;

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.stakingApy(selectedChainSlug),
    queryFn: () => fetchStakingApy(endpoint!),
    enabled: !!endpoint,
    staleTime: 5 * 60 * 1000,
  });

  return {
    apy: data ?? null,
    isLoading,
  };
};

export { useStakingApy };
