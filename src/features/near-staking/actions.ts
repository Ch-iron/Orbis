import { parseUnits } from 'viem';
import { internalActionToNaj, type InjectedWallet } from '@near-wallet-selector/core';
import { assertNearAccount, readNearBalance, readNearPool, readNearPosition, readNearValidators } from '@/lib/chains/near/client';
export type NearAction = { kind: 'stake' | 'unstake' | 'withdraw'; pool: string; amount: string };
export async function prepareNearAction(owner: string, action: NearAction): Promise<Parameters<InjectedWallet['signAndSendTransaction']>[0]> {
  assertNearAccount(owner); assertNearAccount(action.pool);
  if (!/^\d+(\.\d{1,24})?$/.test(action.amount)) throw new Error('Enter an amount with up to 24 decimal places.');
  const amount = parseUnits(action.amount, 24);
  if (amount <= BigInt(0) || amount >= BigInt(2) ** BigInt(128)) throw new Error('The amount is outside the allowed range.');
  if (action.kind === 'stake') {
    const [validators, pool, balance] = await Promise.all([readNearValidators(), readNearPool(action.pool), readNearBalance(owner)]);
    if (!validators.some((item) => item.account_id === action.pool && !item.is_slashed) || pool.paused) throw new Error('This validator pool is not currently accepting stakes.');
    // Keep a small gas reserve in addition to the storage reserve deducted by readNearBalance.
    if (amount + parseUnits('0.01', 24) > BigInt(balance)) throw new Error('The amount exceeds the balance after reserving 0.01 NEAR for gas.');
  } else {
    const position = await readNearPosition(action.pool, owner);
    if (amount > (action.kind === 'unstake' ? position.staked : position.unstaked)) throw new Error('The amount exceeds the staked or withdrawable balance.');
    if (action.kind === 'withdraw' && !position.canWithdraw) throw new Error('The unstaking waiting epochs have not ended.');
  }
  return { signerId: owner, receiverId: action.pool, actions: [internalActionToNaj({ type: 'FunctionCall', params: { methodName: action.kind === 'stake' ? 'deposit_and_stake' : action.kind, args: action.kind === 'stake' ? {} : { amount: amount.toString() }, gas: '100000000000000', deposit: action.kind === 'stake' ? amount.toString() : '0' } })] };
}
