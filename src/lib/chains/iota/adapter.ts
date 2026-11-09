import type { StakingAdapter } from '../adapter';
import { iotaClient, readIotaPositions, readIotaValidators } from './client';

export function createIotaAdapter(): StakingAdapter {
  const unsupported = (): never => { throw new Error('Use the IOTA staking page for this action.'); };
  return {
    getValidators: readIotaValidators,
    getDelegations: async (owner) => (await readIotaPositions(owner)).map((position) => ({ validatorAddress: position.validatorAddress, validatorName: position.validatorAddress, amount: position.principal.toString(), rewards: position.rewards.toString() })),
    getRewards: async (owner) => {
      const positions = await readIotaPositions(owner);
      return { total: positions.reduce((sum, position) => sum + position.rewards, BigInt(0)).toString(), perValidator: positions.map((position) => ({ validatorAddress: position.validatorAddress, amount: position.rewards.toString() })) };
    },
    // Withdrawing an eligible stake returns principal and rewards in one transaction.
    getUnbonding: async () => [],
    getBalance: async (owner) => (await iotaClient.getBalance({ owner })).totalBalance,
    getTransactionHistory: unsupported, buildDelegateMsg: unsupported, buildUndelegateMsg: unsupported, buildRedelegateMsg: unsupported, buildWithdrawRewardsMsg: unsupported, buildSendMsg: unsupported, buildCompoundMsg: unsupported, buildSplitRewardsMsg: unsupported,
  };
}
