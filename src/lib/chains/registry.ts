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
  evmChainId: 37,
  evmRpc: 'https://dimension-evm-rpc.xpla.dev',
  bech32Prefix: 'xpla',
  stakingApyEndpoint: 'https://dimension-fcd.xpla.dev/v1/validators/apr',
};

const SEI_MAINNET: ChainConfig = {
  id: 'pacific-1',
  slug: 'sei',
  name: 'Sei',
  type: 'cosmos',
  logo: '/chains/sei.svg',
  rpc: 'https://rpc.sei-apis.com',
  lcd: 'https://rest.sei-apis.com',
  explorer: 'https://seiscan.io',
  stakingToken: {
    denom: 'usei',
    decimals: 6,
    symbol: 'SEI',
    coingeckoId: 'sei-network',
  },
  unbondingDays: 21,
  evmChainId: 1329,
  evmRpc: 'https://evm-rpc.sei-apis.com',
  bech32Prefix: 'sei',
};

const CHAIN_REGISTRY: Record<string, ChainConfig> = {
  xpla: XPLA_MAINNET,
  sei: SEI_MAINNET,
};

const DEFAULT_CHAIN_SLUG = 'xpla';

export { CHAIN_REGISTRY, DEFAULT_CHAIN_SLUG };
