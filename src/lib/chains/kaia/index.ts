// Kaia chain configuration module

import type { ChainConfig } from '../types';
import { KAIA_WALLET_OPTIONS } from '@/lib/wallet/evm-options';
import { createKaiaClient } from './client';
import { createKaiaAdapter } from './adapter';
import { PUBLIC_DELEGATION_ABI, CN_STAKING_V3_ABI } from './contracts';
import {
  KAIA_RPC_URL,
  KAIA_EXPLORER_URL,
  KAIA_CHAIN_ID,
  KAIA_UNBONDING_DAYS,
  KAIA_BLOCKS_PER_YEAR,
} from './constants';

// Fetch Kaia APY using kaia_getParams (reward config) and council staking balances
const fetchKaiaApy = async (config: ChainConfig): Promise<number> => {
  // Get reward params: mintingamount, ratio, kip82ratio
  const paramsResponse = await fetch(config.rpc, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'kaia_getParams',
      params: ['latest'],
      id: 1,
    }),
  }).catch((fetchError) => {
    console.error('kaia params fetch error', fetchError);
    return null;
  });

  if (!paramsResponse?.ok) {
    throw new Error('Failed to fetch Kaia params');
  }

  type KaiaParamsResponse = {
    result: Record<string, unknown>;
  };

  const paramsData: KaiaParamsResponse | null = await paramsResponse.json().catch((parseError) => {
    console.error('kaia params parse error', parseError);
    return null;
  });

  const mintingAmountRaw = paramsData?.result?.['reward.mintingamount'] as string | undefined;
  const ratioRaw = paramsData?.result?.['reward.ratio'] as string | undefined;
  const kip82RatioRaw = paramsData?.result?.['reward.kip82ratio'] as string | undefined;

  if (!mintingAmountRaw || !ratioRaw || !kip82RatioRaw) {
    throw new Error('Failed to parse Kaia reward params');
  }

  // mintingamount is in peb (e.g. "9600000000000000000" = 9.6 KAIA)
  const mintingAmountKaia = Number(BigInt(mintingAmountRaw)) / 1e18;

  // ratio "50/25/25" → first number is CN share (%)
  const cnSharePercent = Number(ratioRaw.split('/')[0]) / 100;

  // kip82ratio "20/80" → second number is stakers share (%)
  const stakersPercent = Number(kip82RatioRaw.split('/')[1]) / 100;

  // Stakers reward per block
  const stakersRewardPerBlock = mintingAmountKaia * cnSharePercent * stakersPercent;

  // Get council staking addresses and sum their balances for total staked
  const stakingInfoResponse = await fetch(config.rpc, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'kaia_getStakingInfo',
      params: ['latest'],
      id: 2,
    }),
  }).catch((fetchError) => {
    console.error('kaia staking info fetch error', fetchError);
    return null;
  });

  if (!stakingInfoResponse?.ok) {
    throw new Error('Failed to fetch Kaia staking info');
  }

  type StakingInfoResponse = {
    result: {
      councilStakingAddrs: string[];
    };
  };

  const stakingInfoData: StakingInfoResponse | null = await stakingInfoResponse.json().catch((parseError) => {
    console.error('kaia staking info parse error', parseError);
    return null;
  });

  const stakingAddrs = stakingInfoData?.result?.councilStakingAddrs;

  if (!stakingAddrs || stakingAddrs.length === 0) {
    throw new Error('Failed to parse Kaia staking info');
  }

  // Batch RPC to get all staking contract balances
  const batchBody = stakingAddrs.map((addr, index) => ({
    jsonrpc: '2.0',
    method: 'kaia_getBalance',
    params: [addr, 'latest'],
    id: index,
  }));

  const balanceResponse = await fetch(config.rpc, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(batchBody),
  }).catch((fetchError) => {
    console.error('kaia balance batch fetch error', fetchError);
    return null;
  });

  if (!balanceResponse?.ok) {
    throw new Error('Failed to fetch Kaia staking balances');
  }

  type BatchBalanceResult = { id: number; result: string }[];

  const balanceResults: BatchBalanceResult | null = await balanceResponse.json().catch((parseError) => {
    console.error('kaia balance batch parse error', parseError);
    return null;
  });

  if (!balanceResults) {
    throw new Error('Failed to parse Kaia staking balances');
  }

  const totalStakedKaia = balanceResults.reduce((sum, entry) => {
    const balanceInKaia = Number(BigInt(entry.result)) / 1e18;
    return sum + balanceInKaia;
  }, 0);

  if (totalStakedKaia === 0) {
    return 0;
  }

  const annualStakersReward = stakersRewardPerBlock * KAIA_BLOCKS_PER_YEAR;
  const apy = annualStakersReward / totalStakedKaia;

  return apy;
};

// Each adapter owns its council metadata cache.
const createAdapter = () => {
  const client = createKaiaClient();
  return createKaiaAdapter(client);
};

const KAIA_CONFIG: ChainConfig = {
  id: 'kaia-mainnet',
  slug: 'kaia',
  name: 'Kaia',
  type: 'evm',
  logo: '/chains/kaia.png',
  rpc: KAIA_RPC_URL,
  lcd: '',
  explorer: KAIA_EXPLORER_URL,
  stakingToken: {
    denom: 'KAIA',
    decimals: 18,
    symbol: 'KAIA',
    coingeckoId: 'klay-token',
  },
  unbondingDays: KAIA_UNBONDING_DAYS,
  evmChainId: KAIA_CHAIN_ID,
  evmRpc: KAIA_RPC_URL,
  publicDelegation: {
    stakingAbi: PUBLIC_DELEGATION_ABI,
    cnStakingAbi: CN_STAKING_V3_ABI,
  },
  txHistoryExternalUrl: (address: string) => `https://kaiascan.io/account/${address}?tabId=txList`,
  evmWalletOptions: KAIA_WALLET_OPTIONS,
  createAdapter,
  fetchApy: fetchKaiaApy,
};

export { KAIA_CONFIG };
