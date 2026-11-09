import type { StakingAdapter } from '../adapter';
import { readAvalancheBalance, readAvalanchePositions } from './client';
export function createAvalancheAdapter(): StakingAdapter {
  const unsupported = (): never => { throw new Error('Use the Avalanche P-Chain staking page.'); };
  return {
    getValidators: unsupported,
    getBalance: async (address) => (await readAvalancheBalance(address)).unlocked.toString(),
    getDelegations: async (address) => (await readAvalanchePositions(address)).map((position) => ({ validatorAddress: position.nodeId, validatorName: position.nodeId, amount: position.autoRenew?.compoundedWeight ?? position.amountStaked.find((token) => token.symbol === 'AVAX')?.amount ?? '0', rewards: '0' })),
    getRewards: async () => ({ total: '0', perValidator: [] }), getUnbonding: async () => [],
    getTransactionHistory: unsupported, buildDelegateMsg: unsupported, buildUndelegateMsg: unsupported, buildRedelegateMsg: unsupported, buildWithdrawRewardsMsg: unsupported, buildSendMsg: unsupported, buildCompoundMsg: unsupported, buildSplitRewardsMsg: unsupported,
  };
}
