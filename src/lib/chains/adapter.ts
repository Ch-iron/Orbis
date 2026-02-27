// Abstract staking adapter type for chain-agnostic operations

import type {
  Validator,
  Delegation,
  RewardInfo,
  UnbondingEntry,
  DelegateParams,
  UndelegateParams,
  RedelegateParams,
  WithdrawParams,
  SendParams,
  CompoundParams,
  SplitRewardsParams,
  TxHistoryResponse,
} from './types';

export type StakingAdapter = {
  getValidators: () => Promise<Validator[]>;
  getDelegations: (address: string) => Promise<Delegation[]>;
  getRewards: (address: string) => Promise<RewardInfo>;
  getUnbonding: (address: string) => Promise<UnbondingEntry[]>;
  getBalance: (address: string) => Promise<string>;
  getTransactionHistory: (
    address: string,
    limit?: number,
    page?: number,
  ) => Promise<TxHistoryResponse>;
  buildDelegateMsg: (params: DelegateParams) => unknown;
  buildUndelegateMsg: (params: UndelegateParams) => unknown;
  buildRedelegateMsg: (params: RedelegateParams) => unknown;
  buildWithdrawRewardsMsg: (params: WithdrawParams) => unknown[];
  buildSendMsg: (params: SendParams) => unknown;
  buildCompoundMsg: (params: CompoundParams) => unknown[];
  buildSplitRewardsMsg: (params: SplitRewardsParams) => unknown[];
};
