'use client';

import type { ReactNode } from 'react';
import { IotaClientProvider, WalletProvider } from '@iota/dapp-kit';
import { IOTA_RPC } from '@/lib/chains/iota/client';

const networks = { mainnet: { url: IOTA_RPC } };
export function IotaProvider({ children }: { children: ReactNode }) {
  return <IotaClientProvider networks={networks} defaultNetwork="mainnet"><WalletProvider autoConnect chain="iota:mainnet" preferredWallets={['IOTA Wallet', 'Nightly']} walletFilter={(wallet) => ['IOTA Wallet', 'Nightly'].includes(wallet.name)}>{children}</WalletProvider></IotaClientProvider>;
}
