'use client';

import { useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import {
  useWallet,
  useConnectedWallet,
  WalletStatus,
} from '@xpla/wallet-provider';
import { useAccount } from 'wagmi';
import { useWalletTypeStore } from '@/stores/walletTypeStore';
import { CHAIN_REGISTRY } from '@/lib/chains/registry';
import { queryKeys } from '@/lib/queryKeys';
import { evmToBech32 } from '@/lib/utils/address';
import { fetchAssociatedCosmosAddress } from '@/lib/chains/address-resolution';
import type { ChainConfig, Delegation, RewardInfo, UnbondingEntry } from '@/lib/chains/types';

type ChainStakingData = {
  config: ChainConfig;
  address: string | null;
  delegations: Delegation[] | undefined;
  delegationsLoading: boolean;
  rewards: RewardInfo | undefined;
  rewardsLoading: boolean;
  unbonding: UnbondingEntry[] | undefined;
  unbondingLoading: boolean;
  balance: string | undefined;
  balanceLoading: boolean;
  apy: number | null;
  apyLoading: boolean;
};

const CHAIN_SLUGS = Object.keys(CHAIN_REGISTRY);

// Find the first chain config that needs address resolution
const findAddressResolutionConfig = () => {
  for (const slug of CHAIN_SLUGS) {
    const config = CHAIN_REGISTRY[slug]!;
    if (config.addressResolution) {
      return config;
    }
  }
  return null;
};

const useMultiChainStaking = (): {
  chains: ChainStakingData[];
  isConnected: boolean;
} => {
  const { status } = useWallet();
  const connectedWallet = useConnectedWallet();
  const { address: evmAddress, isConnected: isEvmConnected } = useAccount();
  const walletType = useWalletTypeStore((state) => state.walletType);

  const isCosmosConnected = status === WalletStatus.WALLET_CONNECTED;
  const isConnected = (walletType === 'evm' && isEvmConnected) || isCosmosConnected;

  // Address resolution query for chains that need it (e.g. SEI)
  const resolutionConfig = findAddressResolutionConfig();
  const needsResolution = walletType === 'evm' && isEvmConnected && !!evmAddress && !!resolutionConfig?.addressResolution;

  const { data: associatedCosmosAddress } = useQuery({
    queryKey: ['addressAssociation', resolutionConfig?.slug, evmAddress],
    queryFn: () => fetchAssociatedCosmosAddress(
      resolutionConfig!.lcd,
      resolutionConfig!.addressResolution!.evmToCosmosEndpoint,
      evmAddress!,
    ),
    enabled: needsResolution,
    staleTime: Infinity,
  });

  // Compute per-chain wallet addresses
  const chainAddresses = useMemo(() => {
    return CHAIN_SLUGS.map((slug) => {
      const config = CHAIN_REGISTRY[slug]!;

      if (walletType === 'evm' && isEvmConnected && evmAddress) {
        if (config.addressResolution) {
          return associatedCosmosAddress ?? evmToBech32(evmAddress, config.bech32Prefix ?? 'cosmos');
        }
        return evmToBech32(evmAddress, config.bech32Prefix ?? 'cosmos');
      }

      if (isCosmosConnected && slug === 'xpla' && connectedWallet?.xplaAddress) {
        return connectedWallet.xplaAddress;
      }

      return null;
    });
  }, [walletType, isEvmConnected, evmAddress, associatedCosmosAddress, isCosmosConnected, connectedWallet]);

  // Create adapters (memoized, read-only)
  const adapters = useMemo(() => {
    return Object.fromEntries(
      CHAIN_SLUGS.map((slug) => {
        const config = CHAIN_REGISTRY[slug]!;
        return [slug, config.createAdapter(config, '', evmAddress ?? '')];
      }),
    );
  }, [evmAddress]);

  // Parallel queries for all chains
  const delegationResults = useQueries({
    queries: CHAIN_SLUGS.map((slug, index) => ({
      queryKey: queryKeys.delegations(slug, chainAddresses[index] ?? ''),
      queryFn: () => adapters[slug]!.getDelegations(chainAddresses[index]!),
      enabled: !!chainAddresses[index],
      staleTime: 30_000,
    })),
  });

  const rewardResults = useQueries({
    queries: CHAIN_SLUGS.map((slug, index) => ({
      queryKey: queryKeys.rewards(slug, chainAddresses[index] ?? ''),
      queryFn: () => adapters[slug]!.getRewards(chainAddresses[index]!),
      enabled: !!chainAddresses[index],
      staleTime: 30_000,
    })),
  });

  const unbondingResults = useQueries({
    queries: CHAIN_SLUGS.map((slug, index) => ({
      queryKey: queryKeys.unbonding(slug, chainAddresses[index] ?? ''),
      queryFn: () => adapters[slug]!.getUnbonding(chainAddresses[index]!),
      enabled: !!chainAddresses[index],
      staleTime: 30_000,
    })),
  });

  const balanceResults = useQueries({
    queries: CHAIN_SLUGS.map((slug, index) => ({
      queryKey: queryKeys.balance(slug, chainAddresses[index] ?? ''),
      queryFn: () => adapters[slug]!.getBalance(chainAddresses[index]!),
      enabled: !!chainAddresses[index],
      staleTime: 15_000,
    })),
  });

  const apyResults = useQueries({
    queries: CHAIN_SLUGS.map((slug) => ({
      queryKey: queryKeys.stakingApy(slug),
      queryFn: () => {
        const config = CHAIN_REGISTRY[slug]!;
        return config.fetchApy(config);
      },
      staleTime: 5 * 60 * 1000,
    })),
  });

  // Combine results per chain
  const chains: ChainStakingData[] = CHAIN_SLUGS.map((slug, index) => ({
    config: CHAIN_REGISTRY[slug]!,
    address: chainAddresses[index] ?? null,
    delegations: delegationResults[index]?.data,
    delegationsLoading: delegationResults[index]?.isLoading ?? false,
    rewards: rewardResults[index]?.data,
    rewardsLoading: rewardResults[index]?.isLoading ?? false,
    unbonding: unbondingResults[index]?.data,
    unbondingLoading: unbondingResults[index]?.isLoading ?? false,
    balance: balanceResults[index]?.data,
    balanceLoading: balanceResults[index]?.isLoading ?? false,
    apy: apyResults[index]?.data ?? null,
    apyLoading: apyResults[index]?.isLoading ?? false,
  }));

  return { chains, isConnected };
};

export { useMultiChainStaking };
export type { ChainStakingData };
