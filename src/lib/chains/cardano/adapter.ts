import type { StakingAdapter } from '../adapter';
import { readCardanoAccount } from './client';
export function createCardanoAdapter(): StakingAdapter {
  const unsupported = (): never => { throw new Error('Use the Cardano staking page for this action.'); };
  return {
    getValidators: unsupported,
    getBalance: async (stake) => (await readCardanoAccount(stake))?.utxo ?? '0',
    getDelegations: async (stake) => {
      const account = await readCardanoAccount(stake);
      return account?.status === 'registered' && account.delegated_pool ? [{ validatorAddress: account.delegated_pool, validatorName: account.delegated_pool, amount: account.utxo, rewards: account.rewards_available }] : [];
    },
    getRewards: async (stake) => { const account = await readCardanoAccount(stake); return { total: account?.rewards_available ?? '0', perValidator: account?.delegated_pool ? [{ validatorAddress: account.delegated_pool, amount: account.rewards_available }] : [] }; },
    getUnbonding: async () => [],
    getTransactionHistory: unsupported, buildDelegateMsg: unsupported, buildUndelegateMsg: unsupported, buildRedelegateMsg: unsupported, buildWithdrawRewardsMsg: unsupported, buildSendMsg: unsupported, buildCompoundMsg: unsupported, buildSplitRewardsMsg: unsupported,
  };
}
