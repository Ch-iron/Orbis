'use client';
import { AptosWalletAdapterProvider } from '@aptos-labs/wallet-adapter-react';
import { Network } from '@aptos-labs/ts-sdk';
import { toast } from 'sonner';
import type { ReactNode } from 'react';
export function AptosProvider({ children }: { children: ReactNode }) {
  return <AptosWalletAdapterProvider autoConnect optInWallets={['Petra', 'Nightly']} dappConfig={{ network: Network.MAINNET }} disableTelemetry onError={(error) => toast.error(error instanceof Error ? error.message : String(error))}>{children}</AptosWalletAdapterProvider>;
}
