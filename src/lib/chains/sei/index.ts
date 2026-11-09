// SEI chain configuration module

import type { ChainConfig } from '../types';
import { EVM_WALLET_OPTIONS } from '@/lib/wallet/evm-options';
import { createCosmosLcdClient } from './client';
import { createSeiAdapter } from './adapter';
import { fetchSeiApr } from './apr';
import {
  SEI_STAKING_PRECOMPILE_ADDRESS,
  SEI_DISTRIBUTION_PRECOMPILE_ADDRESS,
  SEI_STAKING_PRECOMPILE_ABI,
  SEI_DISTRIBUTION_PRECOMPILE_ABI,
} from './precompile';
import { SEI_GAS_PRICES, SEI_GAS_ADJUSTMENT } from './constants';

// Create a SEI staking adapter from config and wallet addresses
const createAdapter = (config: ChainConfig, walletAddress: string, evmAddress: string) => {
  const client = createCosmosLcdClient(config.lcd);
  return createSeiAdapter(config, client, walletAddress, evmAddress);
};

const SEI_CONFIG: ChainConfig = {
  id: 'pacific-1',
  slug: 'sei',
  name: 'Sei',
  type: 'cosmos',
  logo: '/chains/sei.png',
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
  gas: {
    gasPrices: SEI_GAS_PRICES,
    gasAdjustment: SEI_GAS_ADJUSTMENT,
  },
  evmPrecompile: {
    stakingAddress: SEI_STAKING_PRECOMPILE_ADDRESS as `0x${string}`,
    distributionAddress: SEI_DISTRIBUTION_PRECOMPILE_ADDRESS as `0x${string}`,
    stakingAbi: SEI_STAKING_PRECOMPILE_ABI,
    distributionAbi: SEI_DISTRIBUTION_PRECOMPILE_ABI,
    delegate: {
      payable: true,
      includesDelegatorAddress: false,
      decimalShift: 12,
    },
    undelegate: { includesDelegatorAddress: false },
    redelegate: { includesDelegatorAddress: false },
    withdrawRewards: {
      functionName: 'withdrawMultipleDelegationRewards',
      argStyle: 'validator-list',
    },
  },
  addressResolution: {
    evmToCosmosEndpoint: '/sei-protocol/seichain/evm/sei_address?evm_address={evmAddress}',
    hasDualAddress: true,
  },
  evmWalletOptions: EVM_WALLET_OPTIONS,
  createAdapter,
  fetchApy: fetchSeiApr,
};

export { SEI_CONFIG };
