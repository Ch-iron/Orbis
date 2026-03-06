'use client';

import { useState } from 'react';
import { WalletStatus } from '@xpla/wallet-provider';
import { Wallet, LogOut, Loader2, Copy, ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useWalletInfo } from '@/hooks/useWalletInfo';
import { useChainStore } from '@/stores/chainStore';
import { CHAIN_REGISTRY } from '@/lib/chains/registry';
import { truncateAddress } from '@/lib/utils/format';
import { WalletSelectDialog } from '@/components/layout/WalletSelectDialog';

type AddressView = 'cosmos' | 'evm';

const WalletButton = () => {
  const { status, isConnected, walletAddress, evmAddress, walletType, disconnect } = useWalletInfo();
  const selectedChainSlug = useChainStore((state) => state.selectedChainSlug);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addressView, setAddressView] = useState<AddressView>('evm');

  // Only show initializing state for cosmos wallet (EVM has no INITIALIZING status)
  if (walletType !== 'evm' && status === WalletStatus.INITIALIZING) {
    return (
      <Button variant="outline" disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="ml-2">Loading...</span>
      </Button>
    );
  }

  if (isConnected && walletAddress) {
    // SEI + EVM wallet: allow toggling between sei1... and 0x... display
    const chainName = CHAIN_REGISTRY[selectedChainSlug]?.name ?? selectedChainSlug;
    const chainConfig = CHAIN_REGISTRY[selectedChainSlug];
    const hasDualAddress = !!chainConfig?.addressResolution?.hasDualAddress && walletType === 'evm' && !!evmAddress;
    const displayAddress = hasDualAddress && addressView === 'evm' ? evmAddress : walletAddress;
    const alternateLabel = addressView === 'evm' ? `${chainName} Address` : 'EVM Address';

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Wallet className="h-4 w-4" />
            {truncateAddress(displayAddress)}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => { navigator.clipboard.writeText(walletAddress); }}
          >
            <Copy className="h-4 w-4 mr-2" />
            {hasDualAddress ? `Copy ${chainName} Address` : 'Copy Address'}
          </DropdownMenuItem>
          {hasDualAddress && (
            <DropdownMenuItem
              onClick={() => { navigator.clipboard.writeText(evmAddress); }}
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy EVM Address
            </DropdownMenuItem>
          )}
          {hasDualAddress && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => { setAddressView(addressView === 'cosmos' ? 'evm' : 'cosmos'); }}
              >
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Show {alternateLabel}
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
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
