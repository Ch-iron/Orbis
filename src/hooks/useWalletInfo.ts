'use client';

import { useEffect } from 'react';
import {
  useWallet,
  useConnectedWallet,
  WalletStatus,
} from '@xpla/wallet-provider';
import { useAccount, useDisconnect as useEvmDisconnect } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { useWalletTypeStore } from '@/stores/walletTypeStore';
import { useChainStore } from '@/stores/chainStore';
import { CHAIN_REGISTRY } from '@/lib/chains/registry';
import { evmToBech32 } from '@/lib/utils/address';
import { fetchAssociatedCosmosAddress } from '@/lib/chains/address-resolution';
import type { WalletType } from '@/stores/walletTypeStore';

const useWalletInfo = () => {
  const { status, connect, disconnect: cosmosDisconnect, availableConnections, availableInstallations } = useWallet();
  const connectedWallet = useConnectedWallet();

  const { address: evmAddress, isConnected: isEvmConnected } = useAccount();
  const { disconnect: wagmiDisconnect } = useEvmDisconnect();

  const walletType = useWalletTypeStore((state) => state.walletType);
  const setWalletType = useWalletTypeStore((state) => state.setWalletType);

  // Sync walletType when wagmi restores a session but store is out of sync
  useEffect(() => {
    if (isEvmConnected && evmAddress && walletType !== 'evm') {
      setWalletType('evm');
    }
  }, [isEvmConnected, evmAddress, walletType, setWalletType]);

  const selectedChainSlug = useChainStore((state) => state.selectedChainSlug);
  const chainConfig = CHAIN_REGISTRY[selectedChainSlug];
  const bech32Prefix = chainConfig?.bech32Prefix ?? 'xpla';

  // On-chain address association query (must be called before any return)
  const addressConfig = chainConfig?.addressResolution;
  const needsAddressResolution = !!addressConfig && walletType === 'evm' && isEvmConnected && !!evmAddress;

  const { data: associatedCosmosAddress, isLoading: isAssociatedAddressLoading } = useQuery({
    queryKey: ['addressAssociation', selectedChainSlug, evmAddress],
    queryFn: () => fetchAssociatedCosmosAddress(chainConfig!.lcd, addressConfig!.evmToCosmosEndpoint, evmAddress!),
    enabled: needsAddressResolution,
    staleTime: Infinity,
  });

  if (walletType === 'evm' && isEvmConnected && evmAddress) {
    // For SEI: use on-chain associated address, fallback to bech32(evm_bytes) for unassociated accounts
    // While the association query is loading, return null to prevent querying with wrong address
    const bech32Address = (() => {
      if (needsAddressResolution) {
        if (isAssociatedAddressLoading) {
          return null;
        }
        return associatedCosmosAddress ?? evmToBech32(evmAddress, bech32Prefix);
      }
      return evmToBech32(evmAddress, bech32Prefix);
    })();

    return {
      status: WalletStatus.WALLET_CONNECTED,
      isConnected: true,
      walletAddress: bech32Address,
      evmAddress,
      walletType: 'evm' as WalletType,
      connect,
      disconnect: () => {
        wagmiDisconnect();
        setWalletType(null);
      },
      availableConnections,
      availableInstallations,
      connectedWallet: null,
    };
  }

  const isCosmosConnected = status === WalletStatus.WALLET_CONNECTED;
  const walletAddress = connectedWallet?.xplaAddress ?? null;

  return {
    status,
    isConnected: isCosmosConnected,
    walletAddress,
    evmAddress: null as string | null,
    walletType: isCosmosConnected ? ('cosmos' as WalletType) : walletType,
    connect,
    disconnect: () => {
      cosmosDisconnect();
      setWalletType(null);
    },
    availableConnections,
    availableInstallations,
    connectedWallet,
  };
};

export { useWalletInfo };
