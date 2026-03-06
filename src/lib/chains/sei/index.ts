// SEI chain configuration module

import type { ChainConfig } from '../types';
import { createCosmosLcdClient } from './client';
import { createSeiAdapter } from './adapter';
import {
  SEI_STAKING_PRECOMPILE_ADDRESS,
  SEI_DISTRIBUTION_PRECOMPILE_ADDRESS,
  SEI_STAKING_PRECOMPILE_ABI,
  SEI_DISTRIBUTION_PRECOMPILE_ABI,
} from './precompile';
import { SEI_GAS_PRICES, SEI_GAS_ADJUSTMENT } from './constants';

// SEI custom mint module types for APY calculation

type TokenReleaseEntry = {
  start_date: string;
  end_date: string;
  token_release_amount: string;
};

type SeiMintParamsResponse = {
  params: {
    token_release_schedule: TokenReleaseEntry[];
  };
};

type StakingPoolResponse = {
  pool: {
    bonded_tokens: string;
  };
};

// Calculate inclusive day count between two dates
const calculateDaysInclusive = (start: Date, end: Date): number => {
  const msPerDay = 86400000;
  return Math.round((end.getTime() - start.getTime()) / msPerDay) + 1;
};

// Calculate upcoming mint tokens over a given number of days from a token release schedule
const getUpcomingMintTokens = (
  fromDate: Date,
  days: number,
  schedule: TokenReleaseEntry[],
): number => {
  const toDate = new Date(fromDate.getTime() + days * 86400000);

  const sortedSchedule = [...schedule].sort(
    (entryA, entryB) =>
      new Date(entryA.start_date).getTime() - new Date(entryB.start_date).getTime(),
  );

  return sortedSchedule.reduce((sum, entry) => {
    const entryStart = new Date(entry.start_date);
    const entryEnd = new Date(entry.end_date);

    if (entryEnd < fromDate || entryStart > toDate) {
      return sum;
    }

    const overlapStart = entryStart < fromDate ? fromDate : entryStart;
    const overlapEnd = entryEnd < toDate ? entryEnd : toDate;
    const overlapDays = calculateDaysInclusive(overlapStart, overlapEnd);
    const totalEntryDays = calculateDaysInclusive(entryStart, entryEnd);

    return sum + (overlapDays / totalEntryDays) * parseFloat(entry.token_release_amount);
  }, 0);
};

// Fetch SEI APY using custom mint module (token_release_schedule) and staking pool
const fetchSeiApy = async (config: ChainConfig): Promise<number> => {
  const [mintParamsResponse, poolResponse] = await Promise.all([
    fetch(`${config.lcd}/seichain/mint/v1beta1/params`).catch((fetchError) => {
      console.error('sei mint params fetch error', fetchError);
      return null;
    }),
    fetch(`${config.lcd}/cosmos/staking/v1beta1/pool`).catch((fetchError) => {
      console.error('sei staking pool fetch error', fetchError);
      return null;
    }),
  ]);

  if (!mintParamsResponse?.ok || !poolResponse?.ok) {
    throw new Error('Failed to fetch LCD data for APR calculation');
  }

  const [mintParamsData, poolData] = await Promise.all([
    mintParamsResponse.json().catch((parseError) => {
      console.error('sei mint params parse error', parseError);
      return null;
    }) as Promise<SeiMintParamsResponse | null>,
    poolResponse.json().catch((parseError) => {
      console.error('sei staking pool parse error', parseError);
      return null;
    }) as Promise<StakingPoolResponse | null>,
  ]);

  if (!mintParamsData?.params?.token_release_schedule || !poolData?.pool?.bonded_tokens) {
    throw new Error('Failed to parse LCD data for APR calculation');
  }

  const bondedTokens = parseFloat(poolData.pool.bonded_tokens);

  if (bondedTokens === 0) {
    return 0;
  }

  const annualMint = getUpcomingMintTokens(
    new Date(),
    365,
    mintParamsData.params.token_release_schedule,
  );

  return annualMint / bondedTokens;
};

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
  gas: {
    gasPrices: SEI_GAS_PRICES,
    gasAdjustment: SEI_GAS_ADJUSTMENT,
  },
  evmPrecompile: {
    stakingAddress: SEI_STAKING_PRECOMPILE_ADDRESS as `0x${string}`,
    distributionAddress: SEI_DISTRIBUTION_PRECOMPILE_ADDRESS as `0x${string}`,
    stakingAbi: SEI_STAKING_PRECOMPILE_ABI as unknown as readonly Record<string, unknown>[],
    distributionAbi: SEI_DISTRIBUTION_PRECOMPILE_ABI as unknown as readonly Record<string, unknown>[],
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
  createAdapter,
  fetchApy: fetchSeiApy,
};

export { SEI_CONFIG };
