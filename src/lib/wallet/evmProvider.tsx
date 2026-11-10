'use client';

import type { ReactNode } from 'react';
import { WagmiProvider, http } from 'wagmi';
import { defineChain } from 'viem';
import { mainnet, sonic, iotex, avalanche } from 'viem/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { WALLET_CONNECT_PROJECT_ID } from './constants';
import '@rainbow-me/rainbowkit/styles.css';

// XPLA mainnet EVM chain definition
const xplaMainnet = defineChain({
  id: 37,
  name: 'XPLA',
  nativeCurrency: {
    name: 'XPLA',
    symbol: 'XPLA',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['https://dimension-evm-rpc.xpla.dev'] },
  },
  blockExplorers: {
    default: { name: 'XPLA Explorer', url: 'https://explorer.xpla.io/mainnet' },
  },
});

// SEI mainnet EVM chain definition
const seiMainnet = defineChain({
  id: 1329,
  name: 'Sei',
  nativeCurrency: {
    name: 'SEI',
    symbol: 'SEI',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['https://evm-rpc.sei-apis.com'] },
  },
  blockExplorers: {
    default: { name: 'Seiscan', url: 'https://www.seiscan.app' },
  },
});

// Kaia mainnet EVM chain definition
const kaiaMainnet = defineChain({
  id: 8217,
  name: 'Kaia',
  nativeCurrency: {
    name: 'KAIA',
    symbol: 'KAIA',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['https://public-en.node.kaia.io'] },
  },
  blockExplorers: {
    default: { name: 'KaiaScan', url: 'https://kaiascan.io' },
  },
});

const wagmiConfig = getDefaultConfig({
  appName: 'Orbis',
  projectId: WALLET_CONNECT_PROJECT_ID ?? 'placeholder',
  chains: [xplaMainnet, seiMainnet, kaiaMainnet, mainnet, sonic, iotex, avalanche],
  transports: {
    [xplaMainnet.id]: http(),
    [seiMainnet.id]: http(),
    [kaiaMainnet.id]: http(),
    [sonic.id]: http(),
    [avalanche.id]: http(),
    [iotex.id]: http('https://babel-api.mainnet.iotex.io'),
    [mainnet.id]: http('https://ethereum-rpc.publicnode.com'),
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
