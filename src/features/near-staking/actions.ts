import { parseUnits } from 'viem';
import { internalActionToNaj, type InjectedWallet } from '@near-wallet-selector/core';
import { assertNearAccount, readNearBalance, readNearPool, readNearPosition, readNearValidators } from '@/lib/chains/near/client';
export type NearAction = { kind: 'stake' | 'unstake' | 'withdraw'; pool: string; amount: string };
export async function prepareNearAction(owner: string, action: NearAction): Promise<Parameters<InjectedWallet['signAndSendTransaction']>[0]> {
  assertNearAccount(owner); assertNearAccount(action.pool);
  if (!/^\d+(\.\d{1,24})?$/.test(action.amount)) throw new Error('수량은 소수점 24자리 이내로 입력하세요.');
  const amount = parseUnits(action.amount, 24);
  if (amount <= BigInt(0) || amount >= BigInt(2) ** BigInt(128)) throw new Error('수량이 허용 범위를 벗어납니다.');
  if (action.kind === 'stake') {
    const [validators, pool, balance] = await Promise.all([readNearValidators(), readNearPool(action.pool), readNearBalance(owner)]);
    if (!validators.some((item) => item.account_id === action.pool && !item.is_slashed) || pool.paused) throw new Error('현재 예치 가능한 검증자 풀이 아닙니다.');
    // Keep a small gas reserve in addition to the storage reserve deducted by readNearBalance.
    if (amount + parseUnits('0.01', 24) > BigInt(balance)) throw new Error('가스비 여유분 0.01 NEAR를 제외한 잔액을 초과했습니다.');
  } else {
    const position = await readNearPosition(action.pool, owner);
    if (amount > (action.kind === 'unstake' ? position.staked : position.unstaked)) throw new Error('예치 또는 출금 가능 잔액을 초과했습니다.');
    if (action.kind === 'withdraw' && !position.canWithdraw) throw new Error('해제 대기 에포크가 끝나지 않았습니다.');
  }
  return { signerId: owner, receiverId: action.pool, actions: [internalActionToNaj({ type: 'FunctionCall', params: { methodName: action.kind === 'stake' ? 'deposit_and_stake' : action.kind, args: action.kind === 'stake' ? {} : { amount: amount.toString() }, gas: '100000000000000', deposit: action.kind === 'stake' ? amount.toString() : '0' } })] };
}
