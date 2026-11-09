import type { ChainConfig } from '../types';
import { SUI_RPC } from './client';
import { createSuiAdapter } from './adapter';

export const SUI_CONFIG: ChainConfig = {
  id: 'sui-mainnet', slug: 'sui', name: 'Sui', type: 'move', logo: '/chains/sui.png',
  rpc: SUI_RPC, lcd: '', explorer: 'https://suiscan.xyz/mainnet',
  stakingToken: { denom: 'mist', decimals: 9, symbol: 'SUI', coingeckoId: 'sui' },
  unbondingDays: null, txHistoryExternalUrl: (address) => `https://suiscan.xyz/mainnet/account/${address}`,
  createAdapter: createSuiAdapter, fetchApy: async () => null,
};
