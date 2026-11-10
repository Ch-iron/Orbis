import { encodeFunctionData, type Address } from 'viem';
import { parseStakeAmount } from '@/features/ethereum-staking/amount';
import type { StakingTransaction } from '@/features/ethereum-staking/plan';
import { SAVAX, SAVAX_ABI } from './contracts';
import { readBenqiPosition } from './client';

export type BenqiAction = { kind: 'stake' | 'unstake'; amount: string } | { kind: 'claim' | 'cancel'; id: bigint; startedAt: bigint; shares: bigint };

export async function prepareBenqiAction(owner: Address, action: BenqiAction): Promise<StakingTransaction[]> {
  const position = await readBenqiPosition(owner);
  if ('id' in action) {
    const request = position.withdrawals.find((item) => item.id === action.id && item.startedAt === action.startedAt && item.shares === action.shares);
    if (!request) throw new Error('This BENQI withdrawal request has changed. Refresh and select it again.');
    if (action.kind === 'claim' && !request.ready) throw new Error('This BENQI request is outside its claim window.');
    return [{ to: SAVAX, value: BigInt(0), data: encodeFunctionData({ abi: SAVAX_ABI, functionName: action.kind === 'claim' ? 'redeem' : 'cancelUnlockRequest', args: [request.id] }) }];
  }
  if (position.paused) throw new Error('BENQI staking operations are paused.');
  const amount = parseStakeAmount(action.amount);
  if (action.kind === 'stake') {
    if (position.mintingPaused || amount > position.capacity || amount >= position.available) throw new Error('Check BENQI deposit capacity and leave AVAX for gas.');
    return [{ to: SAVAX, value: amount, data: encodeFunctionData({ abi: SAVAX_ABI, functionName: 'submit' }) }];
  }
  if (amount > position.receipt) throw new Error('Insufficient sAVAX balance.');
  return [{ to: SAVAX, value: BigInt(0), data: encodeFunctionData({ abi: SAVAX_ABI, functionName: 'requestUnlock', args: [amount] }) }];
}
