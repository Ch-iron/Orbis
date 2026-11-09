'use client';

import type { ReactNode } from 'react';
import { WalletManager, WalletProvider } from '@txnlab/use-wallet-react';
import { pera } from '@perawallet/use-wallet-pera';
import { defly } from '@txnlab/use-wallet-defly';
import { walletConnect } from '@txnlab/use-wallet-walletconnect';
import { WALLET_CONNECT_PROJECT_ID } from './constants';

const manager = new WalletManager({
  wallets: [pera(), defly(), ...(WALLET_CONNECT_PROJECT_ID ? [walletConnect({ projectId: WALLET_CONNECT_PROJECT_ID })] : [])],
  defaultNetwork: 'mainnet',
});

export function AlgorandProvider({ children }: { children: ReactNode }) {
  return <WalletProvider manager={manager}>{children}</WalletProvider>;
}
