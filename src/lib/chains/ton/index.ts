import type { ChainConfig } from '../types';
import { createTonAdapter } from './adapter';
export const TON_CONFIG: ChainConfig = {
  id: 'ton-mainnet', slug: 'ton', name: 'TON', type: 'ton', logo: '/chains/ton.png',
  rpc: 'https://tonapi.io', lcd: '', explorer: 'https://tonviewer.com',
  stakingToken: { denom: 'ton', decimals: 9, symbol: 'TON', coingeckoId: 'the-open-network' },
  unbondingDays: null, txHistoryExternalUrl: (address) => `https://tonviewer.com/${address}`,
  createAdapter: createTonAdapter, fetchApy: async () => null,
};
