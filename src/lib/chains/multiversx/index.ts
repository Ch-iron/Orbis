import type { ChainConfig } from '../types';
import { createMultiversxAdapter } from './adapter';
export const MULTIVERSX_CONFIG: ChainConfig = {
  id: 'multiversx-mainnet', slug: 'multiversx', name: 'MultiversX', type: 'multiversx', logo: '/chains/multiversx.png',
  rpc: 'https://gateway.multiversx.com', lcd: '', explorer: 'https://explorer.multiversx.com',
  stakingToken: { denom: 'egld', decimals: 18, symbol: 'EGLD', coingeckoId: 'elrond-erd-2' },
  unbondingDays: null, txHistoryExternalUrl: (address) => `https://explorer.multiversx.com/accounts/${address}`,
  createAdapter: createMultiversxAdapter, fetchApy: async () => null,
};
