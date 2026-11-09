import { getAddress } from 'viem';
import type { StakingAdapter } from '../adapter';
import { ethereumClient, readEthereumPositions, readLidoWithdrawals } from './client';
import { STETH, RETH } from './contracts';

export function createEthereumAdapter(): StakingAdapter {
  const unsupported = (): never => { throw new Error('Use the Ethereum liquid staking page for this action.'); };
  return {
    getValidators: unsupported,
    getDelegations: async (address) => {
      const balances = await readEthereumPositions(getAddress(address));
      return [
        { validatorAddress: STETH, validatorName: 'Lido (stETH)', amount: balances.steth.toString(), rewards: '0' },
        { validatorAddress: RETH, validatorName: 'Rocket Pool (ETH value)', amount: balances.rethEth.toString(), rewards: '0' },
      ].filter((position) => BigInt(position.amount) > BigInt(0));
    },
    // Liquid staking rewards are already included in the position value.
    getRewards: async () => ({ total: '0', perValidator: [] }),
    getUnbonding: async (address) => (await readLidoWithdrawals(getAddress(address))).map((request) => ({
      validatorAddress: STETH,
      validatorName: request.isFinalized ? 'Lido (ready to claim)' : 'Lido (awaiting finalization)',
      amount: request.amountOfStETH.toString(),
      completionTime: null,
    })),
    getBalance: async (address) => (await ethereumClient.getBalance({ address: getAddress(address) })).toString(),
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
