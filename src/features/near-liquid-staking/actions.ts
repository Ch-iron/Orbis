import { parseUnits } from 'viem';
import { internalActionToNaj, type InjectedWallet } from '@near-wallet-selector/core';
import { assertNearAccount } from '@/lib/chains/near/client';
import { LINEAR_CONTRACT, readLinearPosition } from './client';

export type LinearAction = { kind: 'stake' | 'unstake' | 'withdraw'; amount: string };

export async function prepareLinearAction(owner: string, action: LinearAction): Promise<Parameters<InjectedWallet['signAndSendTransaction']>[0]> {
  assertNearAccount(owner);
  if (!/^\d+(\.\d{1,24})?$/.test(action.amount)) throw new Error('Enter a NEAR amount with up to 24 decimal places.');
  const amount = parseUnits(action.amount, 24);
  if (amount <= BigInt(0) || amount >= BigInt(2) ** BigInt(128)) throw new Error('The amount is outside the allowed range.');
  const position = await readLinearPosition(owner);
  if (position.paused) throw new Error('LiNEAR operations are paused.');
  if (action.kind === 'stake' && amount + parseUnits('0.01', 24) > position.available) throw new Error('Keep at least 0.01 NEAR available for gas.');
  if (action.kind === 'unstake' && amount > position.staked) throw new Error('The amount exceeds the NEAR value of your LiNEAR balance.');
  if (action.kind === 'withdraw' && (!position.canWithdraw || amount > position.unstaked)) throw new Error('This amount is not yet available to withdraw.');
  return {
    signerId: owner,
    receiverId: LINEAR_CONTRACT,
    actions: [internalActionToNaj({ type: 'FunctionCall', params: {
      methodName: action.kind === 'stake' ? 'deposit_and_stake' : action.kind,
      args: action.kind === 'stake' ? {} : { amount: amount.toString() },
      gas: '100000000000000',
      deposit: action.kind === 'stake' ? amount.toString() : '0',
    } })],
  };
}
