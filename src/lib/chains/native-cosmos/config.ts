import type { ChainConfig } from '../types';
import { createNativeCosmosAdapter } from './adapter';

export const CELESTIA_CONFIG: ChainConfig = {
  id: 'celestia', slug: 'celestia', name: 'Celestia', type: 'cosmos', logo: '/chains/celestia.svg',
  rpc: 'https://celestia-rpc.publicnode.com', lcd: 'https://celestia-rest.publicnode.com', explorer: 'https://www.mintscan.io/celestia',
  stakingToken: { denom: 'utia', decimals: 6, symbol: 'TIA', coingeckoId: 'celestia' },
  unbondingDays: null, cosmosKitChainName: 'celestia', bech32Prefix: 'celestia',
  gas: { gasPrices: '0.02utia', gasAdjustment: 1.5 },
  createAdapter: createNativeCosmosAdapter, fetchApy: async () => null,
  txHistoryExternalUrl: (address) => `https://www.mintscan.io/celestia/address/${address}`,
};
