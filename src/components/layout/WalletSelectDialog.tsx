'use client';

import { AvalancheWalletOptions } from '@/features/avalanche-staking/AvalancheWalletOptions';
import Image from 'next/image';
import { CardanoWalletOptions } from '@/features/cardano-staking/CardanoWalletOptions';
import { VechainWalletOptions } from '@/features/vechain-staking/VechainWalletOptions';
import { TonWalletOptions } from '@/features/ton-staking/TonWalletOptions';
import { MultiversxWalletOptions } from '@/features/multiversx-staking/MultiversxWalletOptions';
import { NearWalletOptions } from '@/features/near-staking/NearWalletOptions';
import { AptosWalletOptions } from '@/features/aptos-staking/AptosWalletOptions';
import { SuiWalletOptions } from '@/features/sui-staking/SuiWalletOptions';
import { IotaWalletOptions } from '@/features/iota-staking/IotaWalletOptions';
import { AlgorandWalletOptions } from '@/features/algorand-staking/AlgorandWalletOptions';
import { ConnectType } from '@xpla/wallet-provider';
import type { Connection, Installation } from '@xpla/wallet-provider';
import { useEvmConnection } from '@/features/wallet/useEvmConnection';
import { NativeCosmosWalletOptions } from '@/features/native-cosmos/NativeCosmosWalletOptions';
import { EVM_WALLET_OPTIONS } from '@/lib/wallet/evm-options';
import { WALLET_CONNECT_PROJECT_ID } from '@/lib/wallet/constants';
import { Check } from 'lucide-react';
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
import { isWalletInstalled } from '@/lib/utils/wallet-detection';
import type { CosmosWalletOption, EvmWalletOption } from '@/lib/chains/types';

type WalletSelectDialogProps = {
  open: boolean;
  evmChainId?: number;
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

const WalletSelectDialog = ({ open, onOpenChange, evmChainId: requestedEvmChainId }: WalletSelectDialogProps) => {
  const { availableConnections, availableInstallations, connect } = useWalletInfo();
  const { connectors, connect: connectEvm, pending, error } = useEvmConnection();
  const setWalletType = useWalletTypeStore((state) => state.setWalletType);
  const selectedChainSlug = useChainStore((state) => state.selectedChainSlug);
  const chainConfig = CHAIN_REGISTRY[selectedChainSlug];
  const evmChainId = requestedEvmChainId ?? chainConfig?.evmChainId;
  const cosmosWalletOptions = evmChainId ? [] : chainConfig?.cosmosWalletOptions ?? [];
  const evmWalletOptions = requestedEvmChainId ? EVM_WALLET_OPTIONS : chainConfig?.evmWalletOptions ?? [];
  const hasCosmosWallets = cosmosWalletOptions.length > 0;
  const findEvmConnector = (option: EvmWalletOption) => {
    return connectors.find(
      (connector) => connector.id === option.connectorId,
    ) ?? connectors.find(
      (connector) => connector.name.toLowerCase().includes(option.id),
    );
  };

  const handleEvmWalletClick = async (option: EvmWalletOption) => {
    if (!evmChainId || pending) return;
    const connector = findEvmConnector(option);
    if (!connector) {
      window.open(option.downloadUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    if (await connectEvm(connector, evmChainId)) onOpenChange(false);
  };

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

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!pending) onOpenChange(nextOpen); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Connect Wallet</DialogTitle>
          <DialogDescription>
            Select a wallet to connect.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {!requestedEvmChainId && chainConfig?.slug === 'avalanche' && <AvalancheWalletOptions onConnected={() => onOpenChange(false)} />}
          {chainConfig?.slug === 'cardano' && <CardanoWalletOptions onConnected={() => onOpenChange(false)} />}
          {chainConfig?.slug === 'vechain' && <VechainWalletOptions onConnected={() => onOpenChange(false)} />}
          {chainConfig?.slug === 'ton' && <TonWalletOptions onConnected={() => onOpenChange(false)} />}
          {chainConfig?.slug === 'multiversx' && <MultiversxWalletOptions onConnected={() => onOpenChange(false)} />}
          {chainConfig?.slug === 'near' && <NearWalletOptions onConnected={() => onOpenChange(false)} />}
          {chainConfig?.slug === 'aptos' && <AptosWalletOptions onConnected={() => onOpenChange(false)} />}
          {chainConfig?.slug === 'sui' && <SuiWalletOptions onConnected={() => onOpenChange(false)} />}
          {chainConfig?.slug === 'iota' && <IotaWalletOptions onConnected={() => onOpenChange(false)} />}
          {chainConfig?.slug === 'algorand' && <AlgorandWalletOptions onConnected={() => onOpenChange(false)} />}
          {!evmChainId && chainConfig?.cosmosKitChainName && (
            <NativeCosmosWalletOptions chainName={chainConfig.cosmosKitChainName} onConnected={() => onOpenChange(false)} />
          )}
          {hasCosmosWallets && cosmosWalletOptions.map((option) => {
            const connection = findConnection(availableConnections, option);
            const installation = findInstallation(availableInstallations, option);
            const detectedByFlag = option.injectedFlag ? isWalletInstalled(option.injectedFlag) : false;
            const isAvailable = option.type === 'WALLETCONNECT' || !!connection || detectedByFlag;
            const icon = connection?.icon ?? installation?.icon;

            return (
              <button
                key={`${option.type}:${option.identifier ?? 'default'}`}
                className="flex items-center justify-between rounded-lg border p-4 text-left transition-colors hover:bg-accent"
                onClick={() => { handleCosmosOptionClick(option); }}
              >
                <div className="flex items-center gap-3">
                  {icon && (
                    <Image
                      src={icon}
                      alt={option.label}
                      width={32}
                      height={32}
                      unoptimized
                      className="h-8 w-8 rounded-md"
                    />
                  )}
                  <span className="font-medium">{option.label}</span>
                </div>
                {isAvailable && option.type !== 'WALLETCONNECT' && (
                  <span className="flex items-center gap-1 text-xs text-green-500">
                    <Check className="h-3 w-3" />
                    Installed
                  </span>
                )}
              </button>
            );
          })}

          {evmWalletOptions.map((option) => {
              const connector = findEvmConnector(option);
              const isInjected = option.connectorId !== 'walletConnect';
              const unavailable = option.connectorId === 'walletConnect' && !WALLET_CONNECT_PROJECT_ID;
              const installedByFlag = option.injectedFlag ? isWalletInstalled(option.injectedFlag) : false;
              const isAvailable = isInjected ? installedByFlag : !!connector;

              return (
                <button
                  key={option.id}
                  disabled={pending || unavailable}
                  title={unavailable ? "WalletConnect project ID is not configured." : undefined}
                  className="flex items-center justify-between rounded-lg border p-4 text-left transition-colors hover:bg-accent"
                  onClick={() => { handleEvmWalletClick(option); }}
                >
                  <div className="flex items-center gap-3">
                    <Image
                      src={connector?.icon ?? option.icon}
                      alt={option.label}
                      width={32}
                      height={32}
                      unoptimized
                      className="h-8 w-8 rounded-md"
                    />
                    <span className="font-medium">{option.label}</span>
                  </div>
                  {isInjected && isAvailable && (
                    <span className="flex items-center gap-1 text-xs text-green-500">
                      <Check className="h-3 w-3" />
                      Installed
                    </span>
                  )}
                </button>
              );
            })
          }
          {pending && <p role="status" className="text-sm text-muted-foreground">Confirm the connection and network in your wallet.</p>}
          {error && <p role="alert" className="break-words text-sm text-destructive">{error}</p>}
          {evmWalletOptions.length > 0 && !WALLET_CONNECT_PROJECT_ID && (
            <p className="text-sm text-muted-foreground">WalletConnect is unavailable until a project ID is configured.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export { WalletSelectDialog };
