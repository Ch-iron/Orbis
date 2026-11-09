import type { StakingAdapter } from '../adapter';
import { readMultiversxBalance, readMultiversxPositions, readMultiversxProviders } from './client';
export function createMultiversxAdapter(): StakingAdapter {
  const unsupported = (): never => { throw new Error('Use the MultiversX staking page for this action.'); };
  return {
    getValidators: async () => (await readMultiversxProviders()).map((provider) => ({ address: provider.provider, name: provider.identity ?? provider.provider, logo: null, commission: provider.serviceFee, votingPower: provider.locked, status: provider.numNodes > 0 ? 'active' : 'inactive', description: '' })),
    getBalance: readMultiversxBalance,
    getDelegations: async (owner) => (await readMultiversxPositions(owner)).map((position) => ({ validatorAddress: position.contract, validatorName: position.contract, amount: position.active.toString(), rewards: position.rewards.toString() })),
    getRewards: async (owner) => { const positions = await readMultiversxPositions(owner); return { total: positions.reduce((sum, item) => sum + item.rewards, BigInt(0)).toString(), perValidator: positions.map((item) => ({ validatorAddress: item.contract, amount: item.rewards.toString() })) }; },
    getUnbonding: async (owner) => (await readMultiversxPositions(owner)).filter((position) => position.unstaked > BigInt(0)).map((position) => ({ validatorAddress: position.contract, validatorName: position.contract, amount: position.unstaked.toString(), completionTime: position.withdrawable === position.unstaked ? new Date(0) : null })),
    getTransactionHistory: unsupported, buildDelegateMsg: unsupported, buildUndelegateMsg: unsupported, buildRedelegateMsg: unsupported, buildWithdrawRewardsMsg: unsupported, buildSendMsg: unsupported, buildCompoundMsg: unsupported, buildSplitRewardsMsg: unsupported,
  };
}
