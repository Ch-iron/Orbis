'use client';
import { DAppKitProvider } from '@vechain/dapp-kit-react';
import type { ReactNode } from 'react';
export function VechainProvider({ children }: { children: ReactNode }) {
  const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
  return <DAppKitProvider node="https://mainnet.vechain.org" usePersistence allowedWallets={projectId ? ['veworld', 'sync2', 'wallet-connect'] : ['veworld', 'sync2']} walletConnectOptions={projectId ? { projectId, metadata: { name: 'Orbis', description: 'VeChain staking', url: window.location.origin, icons: [`${window.location.origin}/icon.png`] } } : undefined}>{children}</DAppKitProvider>;
}
