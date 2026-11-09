'use client';

import type { ReactNode } from 'react';
import { createDAppKit, DAppKitProvider } from '@mysten/dapp-kit-react';
import { suiClient } from '@/lib/chains/sui/client';

const dAppKit = createDAppKit({ networks: ['mainnet'], createClient: () => suiClient, autoConnect: true });

export type OrbisSuiKit = typeof dAppKit;

export function SuiProvider({ children }: { children: ReactNode }) {
  return <DAppKitProvider dAppKit={dAppKit}>{children}</DAppKitProvider>;
}
