import type { ChainConfig } from '../types';
import { IOTA_RPC } from './client';
import { createIotaAdapter } from './adapter';

export const IOTA_CONFIG: ChainConfig = {
  id: 'iota-mainnet', slug: 'iota', name: 'IOTA', type: 'move', logo: '/chains/iota.png',
  rpc: IOTA_RPC, lcd: '', explorer: 'https://explorer.iota.org',
  stakingToken: { denom: 'nano', decimals: 9, symbol: 'IOTA', coingeckoId: 'iota' },
  unbondingDays: null,
  txHistoryExternalUrl: (address) => `https://explorer.iota.org/address/${address}?network=mainnet`,
  createAdapter: createIotaAdapter, fetchApy: async () => null,
};
