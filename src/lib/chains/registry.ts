// Chain registry with supported chain configurations

import type { ChainConfig } from './types';

const XPLA_MAINNET: ChainConfig = {
  id: 'dimension_37-1',
  slug: 'xpla',
  name: 'XPLA',
  type: 'cosmos',
  logo: '/chains/xpla.png',
  rpc: 'https://rpc.xpla.io',
  lcd: 'https://dimension-lcd.xpla.dev',
  explorer: 'https://explorer.xpla.io/mainnet',
  stakingToken: {
    denom: 'axpla',
    decimals: 18,
    symbol: 'XPLA',
    coingeckoId: 'xpla',
  },
  unbondingDays: 21,
  cosmosKitChainName: 'xpla',
  stakingApyEndpoint: 'https://dimension-fcd.xpla.dev/v1/dashboard/staking_return',
};

const XPLA_TESTNET: ChainConfig = {
  id: 'cube_47-5',
  slug: 'xpla-testnet',
  name: 'XPLA Testnet',
  type: 'cosmos',
  logo: '/chains/xpla.png',
  rpc: 'https://cube-rpc.xpla.dev',
  lcd: 'https://cube-lcd.xpla.dev',
  explorer: 'https://explorer.xpla.io/testnet',
  stakingToken: {
    denom: 'axpla',
    decimals: 18,
    symbol: 'XPLA',
  },
  unbondingDays: 21,
  cosmosKitChainName: 'xplatestnet',
};

const CHAIN_REGISTRY: Record<string, ChainConfig> = {
  xpla: XPLA_MAINNET,
  'xpla-testnet': XPLA_TESTNET,
};

const DEFAULT_CHAIN_SLUG = 'xpla';

export { CHAIN_REGISTRY, DEFAULT_CHAIN_SLUG };
