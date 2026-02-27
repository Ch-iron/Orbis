'use client';

import { useState } from 'react';
import { WalletStatus } from '@xpla/wallet-provider';
import { Wallet, LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useWalletInfo } from '@/hooks/useWalletInfo';
import { truncateAddress } from '@/lib/utils/format';
import { WalletSelectDialog } from '@/components/layout/WalletSelectDialog';

const WalletButton = () => {
  const { status, isConnected, walletAddress, disconnect } = useWalletInfo();
  const [dialogOpen, setDialogOpen] = useState(false);

  if (status === WalletStatus.INITIALIZING) {
    return (
      <Button variant="outline" disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="ml-2">Loading...</span>
      </Button>
    );
  }

  if (isConnected && walletAddress) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Wallet className="h-4 w-4" />
            {truncateAddress(walletAddress)}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => { navigator.clipboard.writeText(walletAddress); }}
          >
            Copy Address
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => { disconnect(); }}>
            <LogOut className="h-4 w-4 mr-2" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <>
      <Button className="gap-2" onClick={() => { setDialogOpen(true); }}>
        <Wallet className="h-4 w-4" />
        Connect Wallet
      </Button>
      <WalletSelectDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
};

export { WalletButton };
