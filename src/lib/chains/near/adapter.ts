import type { StakingAdapter } from '../adapter';
import { readNearBalance, readNearPositions } from './client';
export function createNearAdapter(): StakingAdapter {
  const unsupported = (): never => { throw new Error('Use the NEAR staking page for this action.'); };
  return {
    getValidators: unsupported, getBalance: readNearBalance,
    getDelegations: async (owner) => (await readNearPositions(owner)).map((position) => ({ validatorAddress: position.pool, validatorName: position.pool, amount: position.staked.toString(), rewards: '0' })),
    // Pool share balances include rewards; there is no separate claimable reward balance.
    getRewards: async () => ({ total: '0', perValidator: [] }),
    getUnbonding: async (owner) => (await readNearPositions(owner)).filter((position) => position.unstaked > BigInt(0)).map((position) => ({ validatorAddress: position.pool, validatorName: position.pool, amount: position.unstaked.toString(), completionTime: position.canWithdraw ? new Date(0) : null })),
    getTransactionHistory: unsupported, buildDelegateMsg: unsupported, buildUndelegateMsg: unsupported, buildRedelegateMsg: unsupported, buildWithdrawRewardsMsg: unsupported, buildSendMsg: unsupported, buildCompoundMsg: unsupported, buildSplitRewardsMsg: unsupported,
  };
}
