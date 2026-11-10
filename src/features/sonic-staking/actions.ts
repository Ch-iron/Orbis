import { encodeFunctionData } from 'viem';
import type { Address } from 'viem';
import { SFC, SFC_ABI } from '@/lib/chains/sonic/contracts';
import { sonicClient, readSonicWithdrawal } from '@/lib/chains/sonic/client';
import { parseStakeAmount } from '@/features/ethereum-staking/amount';
import type { StakingTransaction } from '@/features/ethereum-staking/plan';

export type SonicAction =
  | { kind: 'delegate' | 'undelegate'; validatorId: bigint; amount: string; requestId?: bigint }
  | { kind: 'claimRewards' | 'restakeRewards'; validatorId: bigint }
  | { kind: 'withdraw'; validatorId: bigint; requestId: bigint };

export async function prepareSonicAction(owner: Address, action: SonicAction): Promise<StakingTransaction[]> {
  if (action.validatorId <= BigInt(0)) throw new Error('Select a validator.');
  if (action.kind === 'delegate') {
    const amount = parseStakeAmount(action.amount);
    const validator = await sonicClient.readContract({ address: SFC, abi: SFC_ABI, functionName: 'getValidator', args: [action.validatorId] });
    if (validator[0] !== BigInt(0) || validator[4] === BigInt(0)) throw new Error('This validator is not currently accepting delegations.');
    return [{ to: SFC, value: amount, data: encodeFunctionData({ abi: SFC_ABI, functionName: 'delegate', args: [action.validatorId] }) }];
  }
  if (action.kind === 'undelegate') {
    const amount = parseStakeAmount(action.amount);
    if (action.requestId === undefined || action.requestId <= BigInt(0)) throw new Error('An unstaking request ID is required.');
    const [stake, existing] = await Promise.all([
      sonicClient.readContract({ address: SFC, abi: SFC_ABI, functionName: 'getStake', args: [owner, action.validatorId] }),
      readSonicWithdrawal(owner, action.validatorId, action.requestId),
    ]);
    if (amount > stake) throw new Error('You cannot unstake more than the staked balance.');
    if (existing.amount > BigInt(0)) throw new Error('This unstaking request ID has already been used.');
    return [{ to: SFC, value: BigInt(0), data: encodeFunctionData({ abi: SFC_ABI, functionName: 'undelegate', args: [action.validatorId, action.requestId, amount] }) }];
  }
  if (action.kind === 'withdraw') {
    const request = await readSonicWithdrawal(owner, action.validatorId, action.requestId);
    if (!request.ready) throw new Error('The withdrawal time or epoch has not been reached.');
    return [{ to: SFC, value: BigInt(0), data: encodeFunctionData({ abi: SFC_ABI, functionName: 'withdraw', args: [action.validatorId, action.requestId] }) }];
  }
  const rewards = await sonicClient.readContract({ address: SFC, abi: SFC_ABI, functionName: 'pendingRewards', args: [owner, action.validatorId] });
  if (rewards === BigInt(0)) throw new Error('No rewards to claim.');
  return [{ to: SFC, value: BigInt(0), data: encodeFunctionData({ abi: SFC_ABI, functionName: action.kind, args: [action.validatorId] }) }];
}
