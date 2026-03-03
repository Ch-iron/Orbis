'use client';

import { ConnectType } from '@xpla/wallet-provider';
import type { Connection, Installation } from '@xpla/wallet-provider';
import { ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useWalletInfo } from '@/hooks/useWalletInfo';

type WalletOption = {
  label: string;
  type: ConnectType;
  identifier: string | undefined;
};

const WALLET_OPTIONS: WalletOption[] = [
  {
    label: 'WalletConnect',
    type: ConnectType.WALLETCONNECT,
    identifier: undefined,
  },
  {
    label: 'XPLA Games Wallet',
    type: ConnectType.EXTENSION,
    identifier: 'c2xvault',
  },
  {
    label: 'XPLA Vault Wallet',
    type: ConnectType.EXTENSION,
    identifier: 'xplavault',
  },
];

type WalletSelectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const findConnection = (
  connections: Connection[],
  option: WalletOption,
): Connection | undefined => {
  if (option.type === ConnectType.WALLETCONNECT) {
    return connections.find(
      (connection) => connection.type === ConnectType.WALLETCONNECT,
    );
  }

  return connections.find(
    (connection) =>
      connection.type === option.type &&
      connection.identifier === option.identifier,
  );
};

const findInstallation = (
  installations: Installation[],
  option: WalletOption,
): Installation | undefined => {
  return installations.find(
    (installation) =>
      installation.type === option.type &&
      installation.identifier === option.identifier,
  );
};

const WalletSelectDialog = ({ open, onOpenChange }: WalletSelectDialogProps) => {
  const { availableConnections, availableInstallations, connect } = useWalletInfo();

  const handleOptionClick = (option: WalletOption) => {
    const connection = findConnection(availableConnections, option);

    if (connection) {
      connect(option.type, option.identifier);
      onOpenChange(false);
      return;
    }

    const installation = findInstallation(availableInstallations, option);

    if (installation) {
      window.open(installation.url, '_blank', 'noopener,noreferrer');
    }
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
          {WALLET_OPTIONS.map((option) => {
            const connection = findConnection(availableConnections, option);
            const installation = findInstallation(availableInstallations, option);
            const isAvailable = option.type === ConnectType.WALLETCONNECT || !!connection;
            const isInstallable = !isAvailable && !!installation;
            const icon = connection?.icon ?? installation?.icon;

            return (
              <button
                key={`${option.type}:${option.identifier ?? 'default'}`}
                className="flex items-center justify-between rounded-lg border p-4 text-left transition-colors hover:bg-accent"
                onClick={() => { handleOptionClick(option); }}
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

export { WalletSelectDialog };
