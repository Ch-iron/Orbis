import type { Address } from 'viem';
import type { StakingAdapter } from '../adapter';
import { iotexClient, readIotexBuckets } from './client';
export function createIotexAdapter(): StakingAdapter {
  const unsupported = (): never => { throw new Error('Use the IoTeX staking page for this action.'); };
  return {
    getValidators: unsupported,
    getBalance: async (owner) => (await iotexClient.getBalance({ address: owner as Address })).toString(),
    getDelegations: async (owner) => (await readIotexBuckets(owner as Address)).filter((item) => item.unstakeStartTime === BigInt(0)).map((item) => ({ validatorAddress: item.candidateAddress, validatorName: item.candidateAddress, amount: item.stakedAmount.toString(), rewards: '0' })),
    getRewards: async () => { throw new Error('Check validator payout records for IoTeX reward distributions.'); },
    getUnbonding: async (owner) => (await readIotexBuckets(owner as Address)).filter((item) => item.unstakeStartTime > BigInt(0)).map((item) => ({ validatorAddress: item.candidateAddress, validatorName: item.candidateAddress, amount: item.stakedAmount.toString(), completionTime: new Date(Number(item.unstakeStartTime + BigInt(259200)) * 1000) })),
    getTransactionHistory: unsupported, buildDelegateMsg: unsupported, buildUndelegateMsg: unsupported, buildRedelegateMsg: unsupported, buildWithdrawRewardsMsg: unsupported, buildSendMsg: unsupported, buildCompoundMsg: unsupported, buildSplitRewardsMsg: unsupported,
  };
}
