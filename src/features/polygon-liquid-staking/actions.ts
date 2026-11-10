import { encodeFunctionData, erc20Abi } from 'viem';
import type { Address } from 'viem';
import type { StakingTransaction } from '@/features/ethereum-staking/plan';
import { parseStakeAmount } from '@/features/ethereum-staking/amount';
import { POL } from '@/lib/chains/polygon/contracts';
import { STPOL, PRIORITY_POOL, WITHDRAWAL_POOL, PRIORITY_ABI, WITHDRAWAL_ABI } from './contracts';
import { readStpolPosition } from './client';

export type StpolAction = { kind: 'stake' | 'unstake'; amount: string } | { kind: 'claim' };

export async function prepareStpolAction(owner: Address, action: StpolAction): Promise<StakingTransaction[]> {
  const position = await readStpolPosition(owner);
  if (action.kind === 'claim') {
    if (position.claimable === BigInt(0) || position.claimIds.length === 0) throw new Error('No finalized stPOL withdrawals are available.');
    return [{ to: WITHDRAWAL_POOL, value: BigInt(0), data: encodeFunctionData({ abi: WITHDRAWAL_ABI, functionName: 'withdraw', args: [position.claimIds, position.batchIds] }) }];
  }
  const amount = parseStakeAmount(action.amount);
  if (action.kind === 'stake' && (position.status !== 0 || amount > position.available || amount > position.capacity)) throw new Error('Check your POL balance and the available direct deposit capacity.');
  if (action.kind === 'unstake' && (position.status === 2 || amount > position.receipt || amount < position.minimumWithdrawal)) throw new Error('Check your stPOL balance, the withdrawal minimum and pool status.');
  const token = action.kind === 'stake' ? POL : STPOL;
  const allowance = action.kind === 'stake' ? position.depositAllowance : position.withdrawalAllowance;
  const transactions: StakingTransaction[] = [];
  if (allowance < amount) transactions.push({ to: token, value: BigInt(0), data: encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [PRIORITY_POOL, amount] }) });
  const data = action.kind === 'stake'
    ? encodeFunctionData({ abi: PRIORITY_ABI, functionName: 'deposit', args: [amount, false, position.strategyData] })
    : encodeFunctionData({ abi: PRIORITY_ABI, functionName: 'withdraw', args: [amount, BigInt(0), BigInt(0), [], false, true, position.strategyData] });
  transactions.push({ to: PRIORITY_POOL, value: BigInt(0), data });
  return transactions;
}
