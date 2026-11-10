import type { ChainConfig } from '../types';
import { ETHEREUM_WALLET_OPTIONS } from '@/lib/wallet/evm-options';
import { createPolygonAdapter } from './adapter';
export const POLYGON_CONFIG: ChainConfig = {
  id: 'polygon-staking', slug: 'polygon', name: 'Polygon', type: 'evm', logo: '/chains/polygon.png',
  rpc: 'https://ethereum-rpc.publicnode.com', evmRpc: 'https://ethereum-rpc.publicnode.com', evmChainId: 1, lcd: '', explorer: 'https://etherscan.io',
  stakingToken: { denom: 'pol', decimals: 18, symbol: 'POL', coingeckoId: 'polygon-ecosystem-token' },
  unbondingDays: null, evmWalletOptions: ETHEREUM_WALLET_OPTIONS,
  txHistoryExternalUrl: (address) => `https://etherscan.io/address/${address}`,
  createAdapter: createPolygonAdapter, fetchApy: async () => null,
};
