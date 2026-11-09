import type { Address } from 'viem';
import type { StakingAdapter } from '../adapter';
import { readPolygonBalance, readPolygonPositions, readPolygonValidators, readPolygonWithdrawals } from './client';
export function createPolygonAdapter(): StakingAdapter {
  const unsupported = (): never => { throw new Error('Use the Polygon staking page for this action.'); };
  return {
    getValidators: async () => (await readPolygonValidators()).map((item) => ({ address: item.id.toString(), name: item.name, logo: null, commission: item.commissionPercentage / 100, votingPower: item.totalStake, status: item.status === 'active' ? 'active' : 'inactive', description: '' })),
    getBalance: async (owner) => (await readPolygonBalance(owner as Address)).toString(),
    getDelegations: async (owner) => (await readPolygonPositions(owner as Address)).map((item) => ({ validatorAddress: item.id.toString(), validatorName: `Validator ${item.id}`, amount: item.amount.toString(), rewards: item.rewards.toString() })),
    getRewards: async (owner) => { const positions = await readPolygonPositions(owner as Address); return { total: positions.reduce((sum, item) => sum + item.rewards, BigInt(0)).toString(), perValidator: positions.map((item) => ({ validatorAddress: item.id.toString(), amount: item.rewards.toString() })) }; },
    getUnbonding: async (owner) => (await readPolygonWithdrawals(owner as Address)).map((item) => ({ validatorAddress: item.id.toString(), validatorName: `Validator ${item.id}`, amount: item.amount.toString(), completionTime: item.ready ? new Date(0) : null })),
    getTransactionHistory: unsupported, buildDelegateMsg: unsupported, buildUndelegateMsg: unsupported, buildRedelegateMsg: unsupported, buildWithdrawRewardsMsg: unsupported, buildSendMsg: unsupported, buildCompoundMsg: unsupported, buildSplitRewardsMsg: unsupported,
  };
}
