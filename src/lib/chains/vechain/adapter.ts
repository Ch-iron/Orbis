import type { Address } from 'viem';
import type { StakingAdapter } from '../adapter';
import { readVechainBalance, readVechainPositions } from './client';
export function createVechainAdapter(): StakingAdapter {
  const unsupported = (): never => { throw new Error('Use the VeChain staking page for this action.'); };
  return {
    getValidators: unsupported,
    getBalance: async (owner) => (await readVechainBalance(owner as Address)).vet.toString(),
    getDelegations: async (owner) => (await readVechainPositions(owner as Address)).filter((item) => !item.requestedExit || item.delegation.status !== 2).map((item) => ({ validatorAddress: item.delegation.validator, validatorName: `StarGate NFT #${item.tokenId}`, amount: item.vetAmountStaked.toString(), rewards: '0' })),
    getRewards: async (owner) => { const positions = await readVechainPositions(owner as Address); return { total: '0', perValidator: [], tokens: [{ denom: 'vtho', symbol: 'VTHO', decimals: 18, amount: positions.reduce((sum, item) => sum + item.rewards, BigInt(0)).toString() }] }; },
    getUnbonding: async (owner) => (await readVechainPositions(owner as Address)).filter((item) => item.requestedExit && item.delegation.status === 2).map((item) => ({ validatorAddress: item.delegation.validator, validatorName: `StarGate NFT #${item.tokenId}`, amount: item.vetAmountStaked.toString(), completionTime: null })),
    getTransactionHistory: unsupported, buildDelegateMsg: unsupported, buildUndelegateMsg: unsupported, buildRedelegateMsg: unsupported, buildWithdrawRewardsMsg: unsupported, buildSendMsg: unsupported, buildCompoundMsg: unsupported, buildSplitRewardsMsg: unsupported,
  };
}
