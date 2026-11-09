import type { StakingAdapter } from '../adapter';
import { readTonBalance, readTonPositions } from './client';
export function createTonAdapter(): StakingAdapter {
  const unsupported = (): never => { throw new Error('Use the TON staking page for this action.'); };
  return {
    getValidators: unsupported,
    getBalance: async (owner) => (await readTonBalance(owner)).toString(),
    getDelegations: async (owner) => (await readTonPositions(owner)).filter((item) => !item.withdrawing).map((item) => ({ validatorAddress: item.pool, validatorName: item.pool, amount: (item.active + item.pending).toString(), rewards: '0' })),
    // Pool rewards are already included in the position balance.
    getRewards: async () => ({ total: '0', perValidator: [] }),
    getUnbonding: async (owner) => (await readTonPositions(owner)).filter((item) => item.withdrawing).map((item) => ({ validatorAddress: item.pool, validatorName: item.pool, amount: (item.active + item.pending).toString(), completionTime: null })),
    getTransactionHistory: unsupported, buildDelegateMsg: unsupported, buildUndelegateMsg: unsupported, buildRedelegateMsg: unsupported, buildWithdrawRewardsMsg: unsupported, buildSendMsg: unsupported, buildCompoundMsg: unsupported, buildSplitRewardsMsg: unsupported,
  };
}
