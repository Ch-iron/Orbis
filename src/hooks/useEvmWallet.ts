'use client';

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import type { WalletState } from './useCosmosWallet';

const useEvmWallet = (): WalletState => {
  const { address, isConnected, isConnecting } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  return {
    isConnected,
    walletAddress: address ?? null,
    isLoading: isConnecting,
    connect: () => {
      const connector = connectors[0];
      if (connector) {
        connect({ connector });
      }
    },
    disconnect: () => {
      disconnect();
    },
    // EVM does not use Stargate client
    getSigningStargateClient: () => Promise.resolve(null),
  };
};

export { useEvmWallet };
