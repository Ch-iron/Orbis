import type { ChainConfig } from '../types';
import { createAptosAdapter } from './adapter';
export const APTOS_CONFIG: ChainConfig = {
  id: 'aptos-mainnet', slug: 'aptos', name: 'Aptos', type: 'move', logo: '/chains/aptos.png',
  rpc: 'https://fullnode.mainnet.aptoslabs.com/v1', lcd: '', explorer: 'https://explorer.aptoslabs.com',
  stakingToken: { denom: 'octa', decimals: 8, symbol: 'APT', coingeckoId: 'aptos' },
  unbondingDays: null, txHistoryExternalUrl: (address) => `https://explorer.aptoslabs.com/account/${address}?network=mainnet`,
  createAdapter: createAptosAdapter, fetchApy: async () => null,
};
