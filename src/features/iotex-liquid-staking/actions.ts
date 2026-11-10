import { encodeFunctionData, erc20Abi, type Address } from 'viem';
import { parseStakeAmount } from '@/features/ethereum-staking/amount';
import type { StakingTransaction } from '@/features/ethereum-staking/plan';
import { BEDROCK, UNIIOTX, BEDROCK_ABI, CLEAR_ABI } from './contracts';
import { readBedrockPosition } from './client';

export type BedrockAction = { kind: 'stake' | 'unstake'; amount: string } | { kind: 'claim' };

export async function prepareBedrockAction(owner: Address, action: BedrockAction): Promise<StakingTransaction[]> {
  const position = await readBedrockPosition(owner);
  if (action.kind === 'claim') {
    if (position.clearPaused || position.claimable <= BigInt(0)) throw new Error('No Bedrock balance is currently claimable.');
    return [{ to: position.clear, value: BigInt(0), data: encodeFunctionData({ abi: CLEAR_ABI, functionName: 'claim', args: [position.claimable, owner] }) }];
  }
  if (position.paused || position.tokenPaused) throw new Error('Bedrock staking operations are paused.');
  const amount = parseStakeAmount(action.amount);
  const deadline = position.timestamp + BigInt(600);
  if (action.kind === 'stake') {
    if (amount >= position.available) throw new Error('Leave enough IOTX for gas.');
    return [{ to: BEDROCK, value: amount, data: encodeFunctionData({ abi: BEDROCK_ABI, functionName: 'deposit', args: [deadline] }) }];
  }
  if (position.clearPaused || position.redeemBase <= BigInt(0) || amount % position.redeemBase !== BigInt(0)) throw new Error('Enter an IOTX value in the protocol redemption increment.');
  if (position.reserve <= BigInt(0) || position.supply <= BigInt(0)) throw new Error('Bedrock redemption is unavailable.');
  const burned = amount * position.supply / position.reserve;
  if (burned <= BigInt(0) || burned > position.receipt) throw new Error('Insufficient uniIOTX balance for this redemption.');
  const transactions: StakingTransaction[] = [];
  if (position.allowance < burned) transactions.push({ to: UNIIOTX, value: BigInt(0), data: encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [BEDROCK, burned] }) });
  transactions.push({ to: BEDROCK, value: BigInt(0), data: encodeFunctionData({ abi: BEDROCK_ABI, functionName: 'redeem', args: [amount, deadline] }) });
  return transactions;
}
