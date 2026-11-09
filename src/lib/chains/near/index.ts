import type { ChainConfig } from '../types';
import { createNearAdapter } from './adapter';
import { NEAR_RPC } from './client';
export const NEAR_CONFIG: ChainConfig = {
  id: 'near-mainnet', slug: 'near', name: 'NEAR', type: 'near', logo: '/chains/near.svg',
  rpc: NEAR_RPC, lcd: '', explorer: 'https://nearblocks.io',
  stakingToken: { denom: 'yoctoNEAR', decimals: 24, symbol: 'NEAR', coingeckoId: 'near' },
  unbondingDays: null, txHistoryExternalUrl: (address) => `https://nearblocks.io/address/${address}`,
  createAdapter: createNearAdapter, fetchApy: async () => null,
};
