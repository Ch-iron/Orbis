'use client';

import { ConnectType } from '@xpla/wallet-provider';
import type { Connection, Installation } from '@xpla/wallet-provider';
import { useAccount, useConnect, useSwitchChain } from 'wagmi';
import { ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useWalletInfo } from '@/hooks/useWalletInfo';
import { useWalletTypeStore } from '@/stores/walletTypeStore';
import { useChainStore } from '@/stores/chainStore';
import { CHAIN_REGISTRY } from '@/lib/chains/registry';
import type { CosmosWalletOption } from '@/lib/chains/types';

type WalletSelectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const findConnection = (
  connections: Connection[],
  option: CosmosWalletOption,
): Connection | undefined => {
  if (option.type === 'WALLETCONNECT') {
    return connections.find(
      (connection) => connection.type === ConnectType.WALLETCONNECT,
    );
  }

  return connections.find(
    (connection) =>
      connection.type === (option.type as ConnectType) &&
      connection.identifier === option.identifier,
  );
};

const findInstallation = (
  installations: Installation[],
  option: CosmosWalletOption,
): Installation | undefined => {
  return installations.find(
    (installation) =>
      installation.type === (option.type as ConnectType) &&
      installation.identifier === option.identifier,
  );
};

const METAMASK_DOWNLOAD_URL = 'https://metamask.io/download/';

const WalletSelectDialog = ({ open, onOpenChange }: WalletSelectDialogProps) => {
  const { availableConnections, availableInstallations, connect } = useWalletInfo();
  const { isConnected: isEvmConnected } = useAccount();
  const { connectors, connect: wagmiConnect } = useConnect();
  const { switchChain } = useSwitchChain();
  const setWalletType = useWalletTypeStore((state) => state.setWalletType);
  const selectedChainSlug = useChainStore((state) => state.selectedChainSlug);
  const chainConfig = CHAIN_REGISTRY[selectedChainSlug];
  const evmChainId = chainConfig?.evmChainId;
  const cosmosWalletOptions = chainConfig?.cosmosWalletOptions ?? [];
  const hasCosmosWallets = cosmosWalletOptions.length > 0;

  const metaMaskConnector = connectors.find(
    (connector) => connector.id === 'metaMaskSDK' || connector.id === 'io.metamask',
  ) ?? connectors.find(
    (connector) => connector.name.toLowerCase().includes('metamask'),
  );

  const handleCosmosOptionClick = (option: CosmosWalletOption) => {
    const connection = findConnection(availableConnections, option);

    if (connection) {
      connect(option.type as ConnectType, option.identifier);
      setWalletType('cosmos');
      onOpenChange(false);
      return;
    }

    const installation = findInstallation(availableInstallations, option);

    if (installation) {
      window.open(installation.url, '_blank', 'noopener,noreferrer');
    }
  };

  const activateEvmWallet = () => {
    if (evmChainId) {
      switchChain(
        { chainId: evmChainId },
        {
          onError: (error) => {
            console.error('chain switch error', error);
          },
        },
      );
    }
    setWalletType('evm');
    onOpenChange(false);
  };

  const handleMetaMaskClick = () => {
    if (!metaMaskConnector) {
      window.open(METAMASK_DOWNLOAD_URL, '_blank', 'noopener,noreferrer');
      return;
    }

    // Already connected via wagmi (e.g. persisted session) — just activate
    if (isEvmConnected) {
      activateEvmWallet();
      return;
    }

    wagmiConnect(
      { connector: metaMaskConnector },
      {
        onSuccess: () => {
          activateEvmWallet();
        },
        onError: (error) => {
          console.error('metamask connect error', error);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Connect Wallet</DialogTitle>
          <DialogDescription>
            Select a wallet to connect.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {hasCosmosWallets && cosmosWalletOptions.map((option) => {
            const connection = findConnection(availableConnections, option);
            const installation = findInstallation(availableInstallations, option);
            const isAvailable = option.type === 'WALLETCONNECT' || !!connection;
            const isInstallable = !isAvailable && !!installation;
            const icon = connection?.icon ?? installation?.icon;

            return (
              <button
                key={`${option.type}:${option.identifier ?? 'default'}`}
                className="flex items-center justify-between rounded-lg border p-4 text-left transition-colors hover:bg-accent"
                onClick={() => { handleCosmosOptionClick(option); }}
              >
                <div className="flex items-center gap-3">
                  {icon && (
                    <img
                      src={icon}
                      alt={option.label}
                      className="h-8 w-8 rounded-md"
                    />
                  )}
                  <span className="font-medium">{option.label}</span>
                </div>
                {isInstallable && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    Install
                    <ExternalLink className="h-3 w-3" />
                  </span>
                )}
              </button>
            );
          })}

          {hasCosmosWallets && (
            <div className="my-1 flex items-center gap-2">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">EVM Wallets</span>
              <div className="h-px flex-1 bg-border" />
            </div>
          )}

          <button
            className="flex items-center justify-between rounded-lg border p-4 text-left transition-colors hover:bg-accent"
            onClick={handleMetaMaskClick}
          >
            <div className="flex items-center gap-3">
              <img
                src={metaMaskConnector?.icon ?? '/wallets/metamask.svg'}
                alt="MetaMask"
                className="h-8 w-8 rounded-md"
              />
              <span className="font-medium">MetaMask</span>
            </div>
            {!metaMaskConnector && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                Install
                <ExternalLink className="h-3 w-3" />
              </span>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export { WalletSelectDialog };
