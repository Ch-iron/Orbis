'use client';

import { useChain as useCosmosKitChain } from '@cosmos-kit/react';
import type { ChainConfig } from '@/lib/chains/types';

type WalletState = {
  isConnected: boolean;
  walletAddress: string | null;
  isLoading: boolean;
  connect: () => void;
  disconnect: () => void;
  getSigningStargateClient: () => Promise<unknown>;
};

const useCosmosWallet = (config: ChainConfig): WalletState => {
  const chainName = config.cosmosKitChainName ?? '';

  const {
    address,
    isWalletConnected,
    isWalletConnecting,
    connect,
    disconnect,
    getSigningStargateClient,
  } = useCosmosKitChain(chainName);

  return {
    isConnected: isWalletConnected,
    walletAddress: address ?? null,
    isLoading: isWalletConnecting,
    connect: () => {
      connect();
    },
    disconnect: () => {
      disconnect();
    },
    getSigningStargateClient: () => getSigningStargateClient(),
  };
};

export { useCosmosWallet };
export type { WalletState };
