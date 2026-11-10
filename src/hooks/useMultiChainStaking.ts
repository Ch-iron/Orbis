'use client';

import { useAvalancheWallet } from '@/features/avalanche-staking/wallet';
import { useCardanoWallet } from '@/features/cardano-staking/wallet';
import { useWallet as useVechainWallet } from '@vechain/dapp-kit-react';
import { useTonWallet } from '@tonconnect/ui-react';
import { useMultiversxWallet } from '@/features/multiversx-staking/wallet';
import { useNearWallet } from '@/features/near-staking/wallet';
import { useWallet as useAptosWallet } from '@aptos-labs/wallet-adapter-react';
import { useWallet as useAlgoWallet } from '@txnlab/use-wallet-react';
import { useCurrentAccount as useIotaAccount } from '@iota/dapp-kit';
import { useCurrentAccount as useSuiAccount } from '@mysten/dapp-kit-react';
import { useSuiWalletConnect } from '@/features/sui-staking/walletconnect';
import { useMemo } from 'react';
import { useChain as useCosmosKitChain } from '@cosmos-kit/react';
import { useQueries, useQuery } from '@tanstack/react-query';
import {
  useWallet,
  useConnectedWallet,
  WalletStatus,
} from '@xpla/wallet-provider';
import { useAccount } from 'wagmi';
import { useWalletTypeStore } from '@/stores/walletTypeStore';
import { useKlipStore } from '@/stores/klipStore';
import { CHAIN_REGISTRY, SORTED_CHAIN_SLUGS } from '@/lib/chains/registry';
import { queryKeys } from '@/lib/queryKeys';
import { evmToBech32 } from '@/lib/utils/address';
import { fetchAssociatedCosmosAddress } from '@/lib/chains/address-resolution';
import type { ChainConfig, Delegation, RewardInfo, UnbondingEntry } from '@/lib/chains/types';

type ChainStakingData = {
  config: ChainConfig;
  address: string | null;
  delegations: Delegation[] | undefined;
  delegationsLoading: boolean;
  delegationsError: Error | null;
  rewards: RewardInfo | undefined;
  rewardsLoading: boolean;
  rewardsError: Error | null;
  unbonding: UnbondingEntry[] | undefined;
  unbondingLoading: boolean;
  unbondingError: Error | null;
  balance: string | undefined;
  balanceLoading: boolean;
  balanceError: Error | null;
  apy: number | null;
  apyLoading: boolean;
};

const CHAIN_SLUGS = SORTED_CHAIN_SLUGS;

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
  const klipAddress = useKlipStore((state) => state.klipAddress);
  const avalanche = useAvalancheWallet((state) => state.connection);
  const cardano = useCardanoWallet((state) => state.connection);
  const vechainAddress = useVechainWallet().account;
  const tonWallet = useTonWallet();
  const tonAddress = tonWallet?.account.chain === '-239' ? tonWallet.account.address : null;
  const multiversxAddress = useMultiversxWallet((state) => state.address);
  const nearAddress = useNearWallet((state) => state.address);
  const aptosWallet = useAptosWallet();
  const aptosAddress = aptosWallet.connected && Number(aptosWallet.network?.chainId) === 1 ? aptosWallet.account?.address.toString() : undefined;
  const suiAccount = useSuiAccount();
  const suiWalletConnect = useSuiWalletConnect((state) => state.connection);
  const suiAddress = suiWalletConnect?.address ?? (suiAccount?.chains.includes('sui:mainnet') ? suiAccount.address : null);
  const iotaAccount = useIotaAccount();
  const iotaAddress = iotaAccount?.chains.includes('iota:mainnet') ? iotaAccount.address : null;
  const { activeAddress: algoAddress } = useAlgoWallet();
  const celestiaWallet = useCosmosKitChain('celestia', false);
  const dydxWallet = useCosmosKitChain('dydx', false);
  const celestiaAddress = celestiaWallet.isWalletConnected ? celestiaWallet.address : null;
  const dydxAddress = dydxWallet.isWalletConnected ? dydxWallet.address : null;

  const isCosmosConnected = walletType === 'cosmos' && status === WalletStatus.WALLET_CONNECTED;
  const isConnected = (walletType === 'avalanche' && !!avalanche) || (walletType === 'vechain' && !!vechainAddress) || (walletType === 'cardano' && !!cardano) || (walletType === 'ton' && !!tonAddress) || (walletType === 'multiversx' && !!multiversxAddress) || (walletType === 'near' && !!nearAddress) || (walletType === 'aptos' && !!aptosAddress) || (walletType === 'sui' && !!suiAddress) || (walletType === 'iota' && !!iotaAddress) || (walletType === 'algorand' && !!algoAddress) || (walletType === 'evm' && isEvmConnected) || (walletType === 'klip' && !!klipAddress) || (walletType === 'native-cosmos' && !!(celestiaAddress || dydxAddress)) || isCosmosConnected;

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

      if (walletType === 'avalanche') return slug === 'avalanche' ? avalanche?.address ?? null : null;
      if (walletType === 'cardano') return slug === 'cardano' ? cardano?.stakeAddress ?? null : null;
      if (walletType === 'vechain') return slug === 'vechain' ? vechainAddress : null;
      if (walletType === 'ton') return slug === 'ton' ? tonAddress : null;
      if (walletType === 'multiversx') return slug === 'multiversx' ? multiversxAddress : null;
      if (walletType === 'near') return slug === 'near' ? nearAddress : null;
      if (walletType === 'aptos') return slug === 'aptos' ? aptosAddress ?? null : null;
      if (walletType === 'sui') return slug === 'sui' ? suiAddress ?? null : null;
      if (walletType === 'iota') return slug === 'iota' ? iotaAddress ?? null : null;
      if (walletType === 'algorand') return slug === 'algorand' ? algoAddress : null;

      if (walletType === 'native-cosmos') {
        if (slug === 'celestia') return celestiaAddress ?? null;
        if (slug === 'dydx') return dydxAddress ?? null;
        return null;
      }

      if (walletType === 'klip' && klipAddress && config.slug === 'kaia') {
        return klipAddress;
      }

      if (walletType === 'evm' && isEvmConnected && evmAddress) {
        if (!config.evmChainId) return null;
        if (!config.bech32Prefix) return evmAddress;
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
  }, [walletType, isEvmConnected, evmAddress, associatedCosmosAddress, isCosmosConnected, connectedWallet, klipAddress, celestiaAddress, dydxAddress, algoAddress, iotaAddress, suiAddress, aptosAddress, nearAddress, multiversxAddress, tonAddress, cardano, vechainAddress, avalanche]);

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
    delegationsError: delegationResults[index]?.error ?? null,
    rewards: rewardResults[index]?.data,
    rewardsLoading: rewardResults[index]?.isLoading ?? false,
    rewardsError: rewardResults[index]?.error ?? null,
    unbonding: unbondingResults[index]?.data,
    unbondingLoading: unbondingResults[index]?.isLoading ?? false,
    unbondingError: unbondingResults[index]?.error ?? null,
    balance: balanceResults[index]?.data,
    balanceLoading: balanceResults[index]?.isLoading ?? false,
    balanceError: balanceResults[index]?.error ?? null,
    apy: apyResults[index]?.data ?? null,
    apyLoading: apyResults[index]?.isLoading ?? false,
  }));

  return { chains, isConnected };
};

export { useMultiChainStaking };
export type { ChainStakingData };
