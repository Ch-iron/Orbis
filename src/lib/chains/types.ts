// Chain-agnostic type definitions for multi-chain staking dashboard

import type { StakingAdapter } from './adapter';

type ChainType = 'cosmos' | 'evm';

export type EvmPrecompileConfig = {
  stakingAddress: `0x${string}`;
  distributionAddress: `0x${string}`;
  stakingAbi: readonly Record<string, unknown>[];
  distributionAbi: readonly Record<string, unknown>[];
  delegate: {
    payable: boolean;
    includesDelegatorAddress: boolean;
    decimalShift: number;
  };
  undelegate: { includesDelegatorAddress: boolean };
  redelegate: { includesDelegatorAddress: boolean };
  withdrawRewards: {
    functionName: string;
    argStyle: 'delegator-max' | 'validator-list';
  };
};

export type GasConfig = {
  gasPrices: string;
  gasAdjustment: number;
};

export type AddressResolutionConfig = {
  evmToCosmosEndpoint: string;
  hasDualAddress: boolean;
};

export type CosmosWalletOption = {
  label: string;
  type: string;
  identifier: string | undefined;
};

export type ChainConfig = {
  id: string;
  slug: string;
  name: string;
  type: ChainType;
  logo: string;
  rpc: string;
  lcd: string;
  explorer: string;
  stakingToken: {
    denom: string;
    decimals: number;
    symbol: string;
    coingeckoId?: string;
  };
  unbondingDays: number;
  cosmosKitChainName?: string;
  evmChainId?: number;
  evmRpc?: string;
  bech32Prefix?: string;
  stakingApyEndpoint?: string;
  gas?: GasConfig;
  evmPrecompile?: EvmPrecompileConfig;
  addressResolution?: AddressResolutionConfig;
  cosmosWalletOptions?: CosmosWalletOption[];
  createAdapter: (config: ChainConfig, walletAddress: string, evmAddress: string) => StakingAdapter;
  fetchApy: (config: ChainConfig) => Promise<number>;
};

export type Validator = {
  address: string;
  name: string;
  logo: string | null;
  commission: number; // 0.05 = 5%
  votingPower: string;
  status: 'active' | 'inactive' | 'jailed';
  description: string;
};

export type Delegation = {
  validatorAddress: string;
  validatorName: string;
  amount: string; // raw amount (e.g. axpla)
  rewards: string; // pending rewards
};

export type UnbondingEntry = {
  validatorAddress: string;
  validatorName: string;
  amount: string;
  completionTime: Date;
};

export type RewardInfo = {
  total: string;
  perValidator: Array<{
    validatorAddress: string;
    amount: string;
  }>;
};

export type DelegateParams = {
  validatorAddress: string;
  amount: string;
};

export type UndelegateParams = {
  validatorAddress: string;
  amount: string;
};

export type RedelegateParams = {
  srcValidatorAddress: string;
  dstValidatorAddress: string;
  amount: string;
};

export type WithdrawParams = {
  validatorAddresses: string[];
};

export type SendParams = {
  toAddress: string;
  amount: string;
};

export type CompoundParams = {
  delegations: Array<{
    validatorAddress: string;
    amount: string;
  }>;
};

export type SplitRewardsParams = {
  toAddress: string;
  exchangeAmount: string;
  delegations: Array<{
    validatorAddress: string;
    amount: string;
  }>;
};

export type TxHistoryEntry = {
  hash: string;
  evmHash: string | null;
  height: number;
  timestamp: Date;
  type:
    | 'delegate'
    | 'undelegate'
    | 'redelegate'
    | 'withdraw_rewards'
    | 'send'
    | 'unknown';
  amount: string | null;
  success: boolean;
  memo: string;
};

export type TxHistoryResponse = {
  entries: TxHistoryEntry[];
  total: number;
};
