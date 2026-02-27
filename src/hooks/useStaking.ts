'use client';

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useChain } from './useChain';
import { useWalletInfo } from './useWalletInfo';
import { useChainStore } from '@/stores/chainStore';
import { queryKeys } from '@/lib/queryKeys';

const useValidators = () => {
  const { adapter } = useChain();
  const selectedChainSlug = useChainStore((state) => state.selectedChainSlug);

  return useQuery({
    queryKey: queryKeys.validators(selectedChainSlug),
    queryFn: () => adapter.getValidators(),
    staleTime: 60_000,
  });
};

const useDelegations = () => {
  const { adapter } = useChain();
  const { walletAddress } = useWalletInfo();
  const selectedChainSlug = useChainStore((state) => state.selectedChainSlug);

  return useQuery({
    queryKey: queryKeys.delegations(selectedChainSlug, walletAddress ?? ''),
    queryFn: () => adapter.getDelegations(walletAddress!),
    enabled: !!walletAddress,
    staleTime: 30_000,
  });
};

const useRewards = () => {
  const { adapter } = useChain();
  const { walletAddress } = useWalletInfo();
  const selectedChainSlug = useChainStore((state) => state.selectedChainSlug);

  return useQuery({
    queryKey: queryKeys.rewards(selectedChainSlug, walletAddress ?? ''),
    queryFn: () => adapter.getRewards(walletAddress!),
    enabled: !!walletAddress,
    staleTime: 30_000,
  });
};

const useUnbonding = () => {
  const { adapter } = useChain();
  const { walletAddress } = useWalletInfo();
  const selectedChainSlug = useChainStore((state) => state.selectedChainSlug);

  return useQuery({
    queryKey: queryKeys.unbonding(selectedChainSlug, walletAddress ?? ''),
    queryFn: () => adapter.getUnbonding(walletAddress!),
    enabled: !!walletAddress,
    staleTime: 30_000,
  });
};

const useBalance = () => {
  const { adapter } = useChain();
  const { walletAddress } = useWalletInfo();
  const selectedChainSlug = useChainStore((state) => state.selectedChainSlug);

  return useQuery({
    queryKey: queryKeys.balance(selectedChainSlug, walletAddress ?? ''),
    queryFn: () => adapter.getBalance(walletAddress!),
    enabled: !!walletAddress,
    staleTime: 15_000,
  });
};

const useTxHistory = (page: number = 1) => {
  const { adapter } = useChain();
  const { walletAddress } = useWalletInfo();
  const selectedChainSlug = useChainStore((state) => state.selectedChainSlug);

  return useQuery({
    queryKey: queryKeys.txHistory(selectedChainSlug, walletAddress ?? '', page),
    queryFn: () => adapter.getTransactionHistory(walletAddress!, 20, page),
    enabled: !!walletAddress,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
};

export {
  useValidators,
  useDelegations,
  useRewards,
  useUnbonding,
  useBalance,
  useTxHistory,
};
