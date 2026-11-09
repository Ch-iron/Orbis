import type { ChainConfig } from '../types';
import { ALGORAND_RPC } from './contracts';
import { createAlgorandAdapter } from './adapter';

export const ALGORAND_CONFIG: ChainConfig = {
  id: 'mainnet-v1.0', slug: 'algorand', name: 'Algorand', type: 'algorand',
  logo: '/chains/algorand.png', rpc: ALGORAND_RPC, lcd: '', explorer: 'https://allo.info',
  stakingToken: { denom: 'microalgo', decimals: 6, symbol: 'ALGO', coingeckoId: 'algorand' },
  unbondingDays: 0,
  txHistoryExternalUrl: (address) => `https://allo.info/account/${address}`,
  createAdapter: createAlgorandAdapter,
  fetchApy: async () => null,
};
