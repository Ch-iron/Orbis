import type { StakingAdapter } from '../adapter';
import { suiClient, readSuiPositions, readSuiValidators } from './client';

export function createSuiAdapter(): StakingAdapter {
  const unsupported = (): never => { throw new Error('Use the Sui staking page for this action.'); };
  return {
    getValidators: readSuiValidators,
    getDelegations: async (owner) => {
      const positions = await readSuiPositions(owner);
      if (positions.some((position) => position.rewards === null)) throw new Error('Check inactive pool balances on the Sui staking page.');
      return positions.map((position) => ({ validatorAddress: position.validatorAddress, validatorName: position.validatorName, amount: position.principal.toString(), rewards: position.rewards!.toString() }));
    },
    getRewards: async (owner) => {
      const positions = await readSuiPositions(owner);
      if (positions.some((position) => position.rewards === null)) throw new Error('Rewards for inactive Sui pools are determined when each stake is withdrawn.');
      return { total: positions.reduce((sum, position) => sum + position.rewards!, BigInt(0)).toString(), perValidator: positions.map((position) => ({ validatorAddress: position.validatorAddress, amount: position.rewards!.toString() })) };
    },
    getUnbonding: async () => [],
    getBalance: async (owner) => (await suiClient.core.getBalance({ owner })).balance.balance,
    getTransactionHistory: unsupported, buildDelegateMsg: unsupported, buildUndelegateMsg: unsupported, buildRedelegateMsg: unsupported, buildWithdrawRewardsMsg: unsupported, buildSendMsg: unsupported, buildCompoundMsg: unsupported, buildSplitRewardsMsg: unsupported,
  };
}
