import type { ChainConfig } from '../types';
import { createAvalancheAdapter } from './adapter';
export const AVALANCHE_CONFIG: ChainConfig = {
  id: 'avalanche-p-mainnet', slug: 'avalanche', name: 'Avalanche', type: 'avalanche', logo: '/chains/avalanche.png',
  rpc: 'https://api.avax.network/ext/bc/P', lcd: '', explorer: 'https://subnets.avax.network/p-chain',
  stakingToken: { denom: 'nAVAX', decimals: 9, symbol: 'AVAX', coingeckoId: 'avalanche-2' },
  unbondingDays: null, txHistoryExternalUrl: (address) => `https://subnets.avax.network/p-chain/address/${address}`,
  createAdapter: createAvalancheAdapter, fetchApy: async () => null,
};
