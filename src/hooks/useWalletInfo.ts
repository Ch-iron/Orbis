'use client';

import {
  useWallet,
  useConnectedWallet,
  WalletStatus,
} from '@xpla/wallet-provider';

const useWalletInfo = () => {
  const { status, connect, disconnect, availableConnections, availableInstallations } = useWallet();
  const connectedWallet = useConnectedWallet();

  const isConnected = status === WalletStatus.WALLET_CONNECTED;
  const walletAddress = connectedWallet?.xplaAddress ?? null;

  return {
    status,
    isConnected,
    walletAddress,
    connect,
    disconnect,
    availableConnections,
    availableInstallations,
    connectedWallet,
  };
};

export { useWalletInfo };
