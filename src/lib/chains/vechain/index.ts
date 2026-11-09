import type { ChainConfig } from '../types';
import { createVechainAdapter } from './adapter';
export const VECHAIN_CONFIG: ChainConfig = {
  id: 'vechain-mainnet', slug: 'vechain', name: 'VeChain', type: 'vechain', logo: '/chains/vechain.svg',
  rpc: 'https://mainnet.vechain.org', lcd: '', explorer: 'https://explore.vechain.org',
  stakingToken: { denom: 'vet', decimals: 18, symbol: 'VET', coingeckoId: 'vechain' },
  rewardTokens: [{ denom: 'vtho', decimals: 18, symbol: 'VTHO' }],
  unbondingDays: null, txHistoryExternalUrl: (address) => `https://explore.vechain.org/accounts/${address}`,
  createAdapter: createVechainAdapter, fetchApy: async () => null,
};
