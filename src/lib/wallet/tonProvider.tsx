'use client';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import type { ReactNode } from 'react';
export function TonProvider({ children }: { children: ReactNode }) {
  return <TonConnectUIProvider manifestUrl={`${window.location.origin}/tonconnect-manifest.json`}>{children}</TonConnectUIProvider>;
}
