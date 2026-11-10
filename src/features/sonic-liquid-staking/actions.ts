import { encodeFunctionData } from 'viem';
import type { Address } from 'viem';
import type { StakingTransaction } from '@/features/ethereum-staking/plan';
import { parseStakeAmount } from '@/features/ethereum-staking/amount';
import { STS, STS_ABI } from './contracts';
import { readBeetsPosition, readBeetsCapacity } from './client';

export type BeetsAction = { kind: 'stake' | 'unstake'; amount: string } | { kind: 'claim'; requestId: bigint };

export async function prepareBeetsAction(owner: Address, action: BeetsAction): Promise<StakingTransaction[]> {
  const position = await readBeetsPosition(owner);
  if (action.kind === 'claim') {
    const request = position.withdrawals.find((item) => item.id === action.requestId);
    if (!request?.ready || position.withdrawPaused) throw new Error('This Beets withdrawal is not ready to claim.');
    return [{ to: STS, value: BigInt(0), data: encodeFunctionData({ abi: STS_ABI, functionName: 'withdraw', args: [action.requestId, false] }) }];
  }
  const amount = parseStakeAmount(action.amount);
  if (action.kind === 'stake') {
    if (position.depositPaused) throw new Error('Beets deposits are paused.');
    if (amount < position.minimumDeposit || amount >= position.available) throw new Error('Check the minimum deposit and leave enough S for gas.');
    return [{ to: STS, value: amount, data: encodeFunctionData({ abi: STS_ABI, functionName: 'deposit' }) }];
  }
  if (amount > position.receipt || amount < position.minimumUnstake) throw new Error('Check your stS balance and the minimum withdrawal amount.');
  if (!position.poolPaused && amount <= position.poolShares) return [{ to: STS, value: BigInt(0), data: encodeFunctionData({ abi: STS_ABI, functionName: 'undelegateFromPool', args: [amount] }) }];
  if (position.undelegatePaused) throw new Error('Beets validator withdrawals are paused.');
  const capacity = (await readBeetsCapacity()).sort((a, b) => a.shares > b.shares ? -1 : 1);
  const ids = []; const amounts = [];
  let remaining = amount;
  for (const validator of capacity) {
    const shares = remaining < validator.shares ? remaining : validator.shares;
    if (shares < position.minimumUnstake) continue;
    ids.push(validator.id); amounts.push(shares); remaining -= shares;
    if (remaining === BigInt(0)) break;
  }
  if (remaining > BigInt(0)) throw new Error('Insufficient withdrawable validator capacity for this amount.');
  return [{ to: STS, value: BigInt(0), data: encodeFunctionData({ abi: STS_ABI, functionName: 'undelegateMany', args: [ids, amounts] }) }];
}
