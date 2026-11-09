import type { ChainConfig } from '../types';
import type { StakingAdapter } from '../adapter';
import { createNativeCosmosClient } from './client';

export function createNativeCosmosAdapter(config: ChainConfig): StakingAdapter {
  const client = createNativeCosmosClient(config);
  const unsupported = (): never => { throw new Error('Use the native Cosmos staking page for this action.'); };
  return {
    getValidators: client.getValidators,
    getDelegations: client.getDelegations,
    getUnbonding: client.getUnbonding,
    getBalance: client.getBalance,
    getRewards: async (address) => {
      const rewards = await client.getRewards(address);
      const total = rewards.total.find((coin) => coin.denom === config.stakingToken.denom)?.amount.split('.')[0] ?? '0';
      const knownTokens = [config.stakingToken, ...(config.rewardTokens ?? [])];
      return {
        total,
        perValidator: rewards.rewards.map((reward) => ({ validatorAddress: reward.validator_address, amount: reward.reward?.find((coin) => coin.denom === config.stakingToken.denom)?.amount.split('.')[0] ?? '0' })),
        tokens: rewards.total.map((coin) => {
          const token = knownTokens.find((item) => item.denom === coin.denom);
          return { denom: coin.denom, symbol: token?.symbol ?? coin.denom, decimals: token?.decimals ?? 0, amount: coin.amount.split('.')[0] };
        }),
      };
    },
    getTransactionHistory: unsupported,
    buildDelegateMsg: unsupported,
    buildUndelegateMsg: unsupported,
    buildRedelegateMsg: unsupported,
    buildWithdrawRewardsMsg: unsupported,
    buildSendMsg: unsupported,
    buildCompoundMsg: unsupported,
    buildSplitRewardsMsg: unsupported,
  };
}
