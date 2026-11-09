import type { StakingAdapter } from '../adapter';
import { readAlgorandAccount, readRetiPositions, readRetiValidators } from './client';

export function createAlgorandAdapter(): StakingAdapter {
  const unsupported = (): never => { throw new Error('Use the Réti staking page for this action.'); };
  return {
    getValidators: async () => (await readRetiValidators()).map((validator) => ({
      address: validator.id.toString(), name: `Réti #${validator.id}`, logo: null,
      commission: validator.commission, votingPower: validator.pools.reduce((sum, pool) => sum + pool.balance, BigInt(0)).toString(),
      status: validator.pools.length ? 'active' : 'inactive', description: validator.owner,
      delegatable: validator.gatingType === 0,
    })),
    getDelegations: async (owner) => (await readRetiPositions(owner)).map((position) => ({
      validatorAddress: position.poolAppId.toString(), validatorName: `Réti #${position.validatorId} · ${position.poolAppId}`,
      amount: position.balance.toString(), rewards: '0',
    })),
    // ALGO rewards are compounded into each pool balance; bonus assets are shown on the dedicated page.
    getRewards: async () => ({ total: '0', perValidator: [] }),
    // Réti withdrawals are atomic and do not create an unbonding queue.
    getUnbonding: async () => [],
    getBalance: async (owner) => (await readAlgorandAccount(owner)).amount.toString(),
    getTransactionHistory: unsupported,
    buildDelegateMsg: unsupported, buildUndelegateMsg: unsupported, buildRedelegateMsg: unsupported,
    buildWithdrawRewardsMsg: unsupported, buildSendMsg: unsupported, buildCompoundMsg: unsupported, buildSplitRewardsMsg: unsupported,
  };
}
