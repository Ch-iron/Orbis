import type { StakingAdapter } from '../adapter';
import { readAptosBalance, readAptosPositions, readAptosValidators } from './client';
export function createAptosAdapter(): StakingAdapter {
  const unsupported = (): never => { throw new Error('Use the Aptos staking page for this action.'); };
  return {
    getValidators: readAptosValidators,
    getBalance: readAptosBalance,
    getDelegations: async (owner) => (await readAptosPositions(owner)).map((position) => ({ validatorAddress: position.pool, validatorName: position.pool, amount: position.active.toString(), rewards: '0' })),
    // Rewards are included in the active balance and cannot be separately claimed.
    getRewards: async () => ({ total: '0', perValidator: [] }),
    getUnbonding: async (owner) => (await readAptosPositions(owner)).flatMap((position) => [
      ...(position.pending > BigInt(0) ? [{ validatorAddress: position.pool, validatorName: position.pool, amount: position.pending.toString(), completionTime: position.unlockAt }] : []),
      ...(position.inactive > BigInt(0) ? [{ validatorAddress: position.pool, validatorName: position.pool, amount: position.inactive.toString(), completionTime: new Date(0) }] : []),
    ]),
    getTransactionHistory: unsupported, buildDelegateMsg: unsupported, buildUndelegateMsg: unsupported, buildRedelegateMsg: unsupported, buildWithdrawRewardsMsg: unsupported, buildSendMsg: unsupported, buildCompoundMsg: unsupported, buildSplitRewardsMsg: unsupported,
  };
}
