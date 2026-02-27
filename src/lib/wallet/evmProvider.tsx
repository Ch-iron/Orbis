'use client';

import { ReactNode } from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { WALLET_CONNECT_PROJECT_ID } from './constants';
import '@rainbow-me/rainbowkit/styles.css';

// Minimal wagmi config with mainnet placeholder
// EVM chains will be added as needed when EVM staking support is implemented
const wagmiConfig = getDefaultConfig({
  appName: 'SquirrelStake',
  projectId: WALLET_CONNECT_PROJECT_ID || 'placeholder',
  chains: [mainnet],
  transports: {
    [mainnet.id]: http(),
  },
});

// Separate QueryClient for wagmi to avoid conflicts with the app's QueryClient
const wagmiQueryClient = new QueryClient();

type EvmProviderProps = {
  children: ReactNode;
};

const EvmProvider = ({ children }: EvmProviderProps) => {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={wagmiQueryClient}>
        <RainbowKitProvider>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};

export { EvmProvider };
