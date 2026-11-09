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

export const DYDX_CONFIG: ChainConfig = {
  id: 'dydx-mainnet-1', slug: 'dydx', name: 'dYdX', type: 'cosmos', logo: '/chains/dydx.svg',
  rpc: 'https://dydx-rpc.publicnode.com', lcd: 'https://dydx-rest.publicnode.com', explorer: 'https://www.mintscan.io/dydx',
  stakingToken: { denom: 'adydx', decimals: 18, symbol: 'DYDX', coingeckoId: 'dydx-chain' },
  rewardTokens: [{ denom: 'ibc/8E27BA2D5493AF5636760E354E46004562C46AB7EC0CC4C1CA14E9E20E2545B5', decimals: 6, symbol: 'USDC' }],
  unbondingDays: null, cosmosKitChainName: 'dydx', bech32Prefix: 'dydx',
  gas: { gasPrices: '12500000000adydx', gasAdjustment: 1.5 },
  createAdapter: createNativeCosmosAdapter, fetchApy: async () => null,
  txHistoryExternalUrl: (address) => `https://www.mintscan.io/dydx/address/${address}`,
};
