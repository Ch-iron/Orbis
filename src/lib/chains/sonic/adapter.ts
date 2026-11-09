import { getAddress } from 'viem';
import type { StakingAdapter } from '../adapter';
import { sonicClient, readSonicValidators, readSonicPositions, readSonicWithdrawals } from './client';

export function createSonicAdapter(): StakingAdapter {
  const unsupported = (): never => { throw new Error('Use the Sonic staking page for this action.'); };
  return {
    getValidators: async () => (await readSonicValidators()).map((validator) => ({ address: validator.id.toString(), name: `Validator #${validator.id}`, logo: null, commission: validator.commission, votingPower: validator.receivedStake.toString(), status: validator.status === BigInt(0) ? 'active' : 'inactive', description: validator.auth })),
    getDelegations: async (owner) => (await readSonicPositions(getAddress(owner))).filter((position) => position.amount > BigInt(0)).map((position) => ({ validatorAddress: position.id.toString(), validatorName: `Validator #${position.id}`, amount: position.amount.toString(), rewards: position.rewards.toString() })),
    getRewards: async (owner) => {
      const positions = await readSonicPositions(getAddress(owner));
      return { total: positions.reduce((sum, position) => sum + position.rewards, BigInt(0)).toString(), perValidator: positions.map((position) => ({ validatorAddress: position.id.toString(), amount: position.rewards.toString() })) };
    },
    getUnbonding: async (owner) => (await readSonicWithdrawals(getAddress(owner))).map((request) => ({ validatorAddress: request.validatorId.toString(), validatorName: `Validator #${request.validatorId}`, amount: request.amount.toString(), completionTime: request.ready ? new Date(Number(request.unlockTime) * 1000) : null })),
    getBalance: async (owner) => (await sonicClient.getBalance({ address: getAddress(owner) })).toString(),
    getTransactionHistory: unsupported, buildDelegateMsg: unsupported, buildUndelegateMsg: unsupported, buildRedelegateMsg: unsupported, buildWithdrawRewardsMsg: unsupported, buildSendMsg: unsupported, buildCompoundMsg: unsupported, buildSplitRewardsMsg: unsupported,
  };
}
