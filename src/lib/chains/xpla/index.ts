// XPLA chain configuration module

import type { ChainConfig } from '../types';
import { createXplaClient } from './client';
import { createXplaAdapter } from './adapter';
import {
  STAKING_PRECOMPILE_ADDRESS,
  DISTRIBUTION_PRECOMPILE_ADDRESS,
  STAKING_PRECOMPILE_ABI,
  DISTRIBUTION_PRECOMPILE_ABI,
} from './precompile';
import { XPLA_GAS_PRICES, XPLA_GAS_ADJUSTMENT } from './constants';

type XplaAprResponse = {
  apr: string;
};

const fetchXplaApy = async (config: ChainConfig): Promise<number> => {
  if (!config.stakingApyEndpoint) {
    throw new Error('XPLA staking APY endpoint not configured');
  }

  const response = await fetch(config.stakingApyEndpoint).catch((fetchError) => {
    console.error('xpla apy fetch error', fetchError);
    return null;
  });

  if (!response?.ok) {
    throw new Error('Failed to fetch staking APY');
  }

  const data: XplaAprResponse | null = await response.json().catch((parseError) => {
    console.error('xpla apy parse error', parseError);
    return null;
  });

  if (!data?.apr) {
    throw new Error('Failed to parse staking APY response');
  }

  return parseFloat(data.apr);
};

const createAdapter = (config: ChainConfig, walletAddress: string, _evmAddress: string) => {
  const client = createXplaClient(config.lcd, config.id);
  return createXplaAdapter(config, client, walletAddress);
};

const XPLA_CONFIG: ChainConfig = {
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
  gas: {
    gasPrices: XPLA_GAS_PRICES,
    gasAdjustment: XPLA_GAS_ADJUSTMENT,
  },
  evmPrecompile: {
    stakingAddress: STAKING_PRECOMPILE_ADDRESS as `0x${string}`,
    distributionAddress: DISTRIBUTION_PRECOMPILE_ADDRESS as `0x${string}`,
    stakingAbi: STAKING_PRECOMPILE_ABI as unknown as readonly Record<string, unknown>[],
    distributionAbi: DISTRIBUTION_PRECOMPILE_ABI as unknown as readonly Record<string, unknown>[],
    delegate: {
      payable: false,
      includesDelegatorAddress: true,
      decimalShift: 0,
    },
    undelegate: { includesDelegatorAddress: true },
    redelegate: { includesDelegatorAddress: true },
    withdrawRewards: {
      functionName: 'claimRewards',
      argStyle: 'delegator-max',
    },
  },
  cosmosWalletOptions: [
    { label: 'WalletConnect', type: 'WALLETCONNECT', identifier: undefined },
    { label: 'XPLA Games Wallet', type: 'EXTENSION', identifier: 'c2xvault' },
    { label: 'XPLA Vault Wallet', type: 'EXTENSION', identifier: 'xplavault' },
  ],
  createAdapter,
  fetchApy: fetchXplaApy,
};

export { XPLA_CONFIG };
