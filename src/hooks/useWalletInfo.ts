'use client';

import { useAvalancheWallet, disconnectAvalancheWallet } from '@/features/avalanche-staking/wallet';
import { useCardanoWallet, disconnectCardanoWallet } from '@/features/cardano-staking/wallet';
import { useWallet as useVechainWallet } from '@vechain/dapp-kit-react';
import { useTonWallet, useTonConnectUI } from '@tonconnect/ui-react';
import { useMultiversxWallet, disconnectMultiversxWallet } from '@/features/multiversx-staking/wallet';
import { useNearWallet, disconnectNearWallet } from '@/features/near-staking/wallet';
import { useWallet as useAptosWallet } from '@aptos-labs/wallet-adapter-react';
import { useWallet as useAlgoWallet } from '@txnlab/use-wallet-react';
import { useCurrentAccount as useIotaAccount, useDisconnectWallet as useIotaDisconnect } from '@iota/dapp-kit';
import { useCurrentAccount as useSuiAccount, useDAppKit } from '@mysten/dapp-kit-react';
import { useSuiWalletConnect, disconnectSuiWalletConnect } from '@/features/sui-staking/walletconnect';
import { useChain as useCosmosKitChain } from '@cosmos-kit/react';
import {
  useWallet,
  useConnectedWallet,
  WalletStatus,
} from '@xpla/wallet-provider';
import { useAccount, useDisconnect as useEvmDisconnect } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { useWalletTypeStore } from '@/stores/walletTypeStore';
import { useKlipStore } from '@/stores/klipStore';
import { useChainStore } from '@/stores/chainStore';
import { CHAIN_REGISTRY } from '@/lib/chains/registry';
import { evmToBech32 } from '@/lib/utils/address';
import { fetchAssociatedCosmosAddress } from '@/lib/chains/address-resolution';
import type { WalletType } from '@/stores/walletTypeStore';

const useWalletInfo = () => {
  const { status, connect, disconnect: cosmosDisconnect, availableConnections, availableInstallations } = useWallet();
  const connectedWallet = useConnectedWallet();

  const { address: evmAddress, isConnected: isEvmConnected } = useAccount();
  const { disconnectAsync: wagmiDisconnect } = useEvmDisconnect();

  const walletType = useWalletTypeStore((state) => state.walletType);
  const setWalletType = useWalletTypeStore((state) => state.setWalletType);
  const klipAddress = useKlipStore((state) => state.klipAddress);
  const setKlipAddress = useKlipStore((state) => state.setKlipAddress);
  const selectedChainSlug = useChainStore((state) => state.selectedChainSlug);
  const chainConfig = CHAIN_REGISTRY[selectedChainSlug];
  const avalanche = useAvalancheWallet((state) => state.connection);
  const cardano = useCardanoWallet((state) => state.connection);
  const vechain = useVechainWallet();
  const tonWallet = useTonWallet();
  const [tonUi] = useTonConnectUI();
  const tonAddress = tonWallet?.account.chain === '-239' ? tonWallet.account.address : null;
  const multiversxAddress = useMultiversxWallet((state) => state.address);
  const nearAddress = useNearWallet((state) => state.address);
  const aptosWallet = useAptosWallet();
  const suiAccount = useSuiAccount();
  const suiKit = useDAppKit();
  const suiWalletConnect = useSuiWalletConnect((state) => state.connection);
  const iotaAccount = useIotaAccount();
  const iotaDisconnect = useIotaDisconnect();
  const algo = useAlgoWallet();
  const nativeCosmos = useCosmosKitChain(chainConfig?.cosmosKitChainName ?? 'celestia', false);

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

  if (chainConfig?.slug === 'avalanche') {
    const connected = walletType === 'avalanche' && !!avalanche;
    return { status: connected ? WalletStatus.WALLET_CONNECTED : WalletStatus.WALLET_NOT_CONNECTED, isConnected: connected, walletAddress: connected ? avalanche.address : null, evmAddress: null, walletType: 'avalanche' as WalletType, connect, disconnect: async () => { setWalletType(null); await disconnectAvalancheWallet(); }, availableConnections, availableInstallations, connectedWallet: null };
  }

  if (chainConfig?.slug === 'cardano') {
    const connected = walletType === 'cardano' && !!cardano;
    return {
      status: connected ? WalletStatus.WALLET_CONNECTED : WalletStatus.WALLET_NOT_CONNECTED,
      isConnected: connected, walletAddress: connected ? cardano.stakeAddress : null,
      evmAddress: null, walletType: 'cardano' as WalletType, connect,
      disconnect: () => { disconnectCardanoWallet(); setWalletType(null); },
      availableConnections, availableInstallations, connectedWallet: null,
    };
  }

  if (chainConfig?.slug === 'vechain') {
    const connected = walletType === 'vechain' && !!vechain.account;
    return {
      status: connected ? WalletStatus.WALLET_CONNECTED : WalletStatus.WALLET_NOT_CONNECTED,
      isConnected: connected, walletAddress: connected ? vechain.account : null,
      evmAddress: null, walletType: 'vechain' as WalletType, connect,
      disconnect: () => { vechain.disconnect(); setWalletType(null); },
      availableConnections, availableInstallations, connectedWallet: null,
    };
  }

  if (chainConfig?.slug === 'ton') {
    const connected = walletType === 'ton' && !!tonAddress;
    return {
      status: connected ? WalletStatus.WALLET_CONNECTED : WalletStatus.WALLET_NOT_CONNECTED,
      isConnected: connected, walletAddress: connected ? tonAddress : null,
      evmAddress: null, walletType: 'ton' as WalletType, connect,
      disconnect: async () => { setWalletType(null); await tonUi.disconnect(); },
      availableConnections, availableInstallations, connectedWallet: null,
    };
  }

  if (chainConfig?.slug === 'multiversx') {
    const connected = walletType === 'multiversx' && !!multiversxAddress;
    return {
      status: connected ? WalletStatus.WALLET_CONNECTED : WalletStatus.WALLET_NOT_CONNECTED,
      isConnected: connected, walletAddress: connected ? multiversxAddress : null,
      evmAddress: null, walletType: 'multiversx' as WalletType, connect,
      disconnect: async () => { setWalletType(null); await disconnectMultiversxWallet(); },
      availableConnections, availableInstallations, connectedWallet: null,
    };
  }

  if (chainConfig?.slug === 'near') {
    const connected = walletType === 'near' && !!nearAddress;
    return {
      status: connected ? WalletStatus.WALLET_CONNECTED : WalletStatus.WALLET_NOT_CONNECTED,
      isConnected: connected, walletAddress: connected ? nearAddress : null,
      evmAddress: null, walletType: 'near' as WalletType, connect,
      disconnect: async () => { setWalletType(null); await disconnectNearWallet(); },
      availableConnections, availableInstallations, connectedWallet: null,
    };
  }

  if (chainConfig?.slug === 'aptos') {
    const address = aptosWallet.account?.address.toString();
    const connected = walletType === 'aptos' && aptosWallet.connected && Number(aptosWallet.network?.chainId) === 1 && !!address;
    return {
      status: connected ? WalletStatus.WALLET_CONNECTED : WalletStatus.WALLET_NOT_CONNECTED,
      isConnected: connected, walletAddress: connected ? address : null,
      evmAddress: null, walletType: 'aptos' as WalletType, connect,
      disconnect: async () => { setWalletType(null); await aptosWallet.disconnect(); },
      availableConnections, availableInstallations, connectedWallet: null,
    };
  }

  if (chainConfig?.slug === 'sui') {
    const address = suiWalletConnect?.address ?? (suiAccount?.chains.includes('sui:mainnet') ? suiAccount.address : null);
    const connected = walletType === 'sui' && !!address;
    return {
      status: connected ? WalletStatus.WALLET_CONNECTED : WalletStatus.WALLET_NOT_CONNECTED,
      isConnected: connected, walletAddress: connected ? address : null,
      evmAddress: null, walletType: 'sui' as WalletType, connect,
      disconnect: async () => { setWalletType(null); await Promise.all([suiKit.disconnectWallet(), disconnectSuiWalletConnect()]); },
      availableConnections, availableInstallations, connectedWallet: null,
    };
  }

  if (chainConfig?.slug === 'iota') {
    const connected = walletType === 'iota' && !!iotaAccount && iotaAccount.chains.includes('iota:mainnet');
    return {
      status: connected ? WalletStatus.WALLET_CONNECTED : WalletStatus.WALLET_NOT_CONNECTED,
      isConnected: connected, walletAddress: connected ? iotaAccount.address : null,
      evmAddress: null, walletType: 'iota' as WalletType, connect,
      disconnect: async () => { setWalletType(null); await iotaDisconnect.mutateAsync(); },
      availableConnections, availableInstallations, connectedWallet: null,
    };
  }

  if (chainConfig?.slug === 'algorand') {
    const connected = walletType === 'algorand' && !!algo.activeAddress;
    return {
      status: connected ? WalletStatus.WALLET_CONNECTED : WalletStatus.WALLET_NOT_CONNECTED,
      isConnected: connected, walletAddress: connected ? algo.activeAddress : null,
      evmAddress: null, walletType: 'algorand' as WalletType, connect,
      disconnect: async () => { setWalletType(null); await algo.activeWallet?.disconnect(); },
      availableConnections, availableInstallations, connectedWallet: null,
    };
  }

  if (chainConfig?.cosmosKitChainName && !chainConfig.evmChainId) {
    const connected = nativeCosmos.isWalletConnected && walletType === 'native-cosmos';
    return {
      status: connected ? WalletStatus.WALLET_CONNECTED : WalletStatus.WALLET_NOT_CONNECTED,
      isConnected: connected,
      walletAddress: connected ? nativeCosmos.address ?? null : null,
      evmAddress: null,
      walletType: 'native-cosmos' as WalletType,
      connect,
      disconnect: async () => { setWalletType(null); await nativeCosmos.disconnect(); },
      availableConnections, availableInstallations, connectedWallet: null,
    };
  }

  // Klip wallet: return klipAddress directly
  if (chainConfig?.slug === 'kaia' && walletType === 'klip' && klipAddress) {
    return {
      status: WalletStatus.WALLET_CONNECTED,
      isConnected: true,
      walletAddress: klipAddress,
      evmAddress: klipAddress,
      walletType: 'klip' as WalletType,
      connect,
      disconnect: () => {
        setKlipAddress(null);
        setWalletType(null);
      },
      availableConnections,
      availableInstallations,
      connectedWallet: null,
    };
  }

  if (walletType === 'evm' && isEvmConnected && evmAddress) {
    // For pure EVM chains (no bech32Prefix): use EVM address directly as wallet address
    // For Cosmos+EVM chains (e.g. SEI): use on-chain associated address or bech32(evm_bytes)
    const walletAddress = (() => {
      if (!chainConfig?.bech32Prefix) {
        return evmAddress;
      }

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
      walletAddress,
      evmAddress,
      walletType: 'evm' as WalletType,
      connect,
      disconnect: async () => {
        setWalletType(null);
        await wagmiDisconnect();
      },
      availableConnections,
      availableInstallations,
      connectedWallet: null,
    };
  }

  const isCosmosConnected = chainConfig?.slug === 'xpla' && walletType === 'cosmos' && status === WalletStatus.WALLET_CONNECTED;
  const walletAddress = isCosmosConnected ? connectedWallet?.xplaAddress ?? null : null;

  return {
    status: walletType === 'cosmos' && chainConfig?.slug === 'xpla' ? status : WalletStatus.WALLET_NOT_CONNECTED,
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
    connectedWallet: isCosmosConnected ? connectedWallet : null,
  };
};

export { useWalletInfo };
