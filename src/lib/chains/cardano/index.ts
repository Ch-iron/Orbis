import type { ChainConfig } from '../types';
import { createCardanoAdapter } from './adapter';
export const CARDANO_CONFIG: ChainConfig = {
  id: 'cardano-mainnet', slug: 'cardano', name: 'Cardano', type: 'cardano', logo: '/chains/cardano.svg',
  rpc: 'https://api.koios.rest/api/v1', lcd: '', explorer: 'https://cardanoscan.io',
  stakingToken: { denom: 'lovelace', decimals: 6, symbol: 'ADA', coingeckoId: 'cardano' },
  unbondingDays: 0, txHistoryExternalUrl: (address) => `https://cardanoscan.io/stakeKey/${address}`,
  createAdapter: createCardanoAdapter, fetchApy: async () => null,
};
