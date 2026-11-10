import { encodeFunctionData } from 'viem';
import type { Address } from 'viem';
import type { StakingTransaction } from '@/features/ethereum-staking/plan';
import { parseStakeAmount } from '@/features/ethereum-staking/amount';
import { STKAIA, STKAIA_ABI } from './contracts';
import { readLairPosition } from './client';

export type LairAction = { kind: 'stake' | 'unstake'; amount: string; node: Address } | { kind: 'claim'; index: bigint };

export async function prepareLairAction(owner: Address, action: LairAction): Promise<StakingTransaction[]> {
  const position = await readLairPosition(owner);
  if (position.paused) throw new Error('Lair staking is paused.');
  if (action.kind === 'claim') {
    const request = position.withdrawals.find((item) => item.index === action.index);
    if (!request?.ready || request.state !== 2) throw new Error('This Lair withdrawal is not ready to claim.');
    return [{ to: STKAIA, value: BigInt(0), data: encodeFunctionData({ abi: STKAIA_ABI, functionName: 'claim', args: [action.index] }) }];
  }
  const node = position.nodes.find((item) => item.node.toLowerCase() === action.node.toLowerCase());
  if (!node || (action.kind === 'stake' && !node.isActive)) throw new Error('Select an available Lair node.');
  const amount = parseStakeAmount(action.amount);
  if (action.kind === 'stake') {
    if (amount >= position.available) throw new Error('Insufficient KAIA. Leave enough for gas.');
    return [{ to: STKAIA, value: amount, data: encodeFunctionData({ abi: STKAIA_ABI, functionName: 'stake', args: [node.node] }) }];
  }
  if (amount > position.receipt) throw new Error('Insufficient stKAIA balance.');
  const transactions: StakingTransaction[] = [];
  if (amount > position.allowance) transactions.push({ to: STKAIA, value: BigInt(0), data: encodeFunctionData({ abi: STKAIA_ABI, functionName: 'approve', args: [STKAIA, amount] }) });
  transactions.push({ to: STKAIA, value: BigInt(0), data: encodeFunctionData({ abi: STKAIA_ABI, functionName: 'unstake', args: [node.node, amount] }) });
  return transactions;
}
