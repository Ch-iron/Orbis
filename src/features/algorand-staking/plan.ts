import type { RetiValidator } from '@/lib/chains/algorand/decode';

export function parseAlgoAmount(input: string) {
  if (!/^\d+(\.\d{1,6})?$/.test(input)) throw new Error('금액은 소수점 6자리 이내로 입력하세요.');
  const [whole, fraction = ''] = input.split('.');
  const amount = BigInt(whole) * BigInt(1_000_000) + BigInt(fraction.padEnd(6, '0'));
  if (amount <= BigInt(0)) throw new Error('금액은 0보다 커야 합니다.');
  return amount;
}

export function validateRetiDeposit(validator: RetiValidator, amount: bigint, existing: boolean, now: number) {
  if (validator.gatingType !== 0) throw new Error('이 풀은 별도 자산 보유 조건이 있습니다. Réti 공식 앱에서 이용하세요.');
  if (validator.sunsettingOn > BigInt(0) && validator.sunsettingOn <= BigInt(now)) throw new Error('운영이 종료된 검증자입니다.');
  if (validator.pools.length === 0) throw new Error('운영 중인 풀이 없습니다.');
  if (!existing && amount < validator.minimum) throw new Error('검증자의 최소 예치금보다 적습니다.');
}

export function validateRetiWithdrawal(amount: bigint, balance: bigint, minimum: bigint) {
  if (amount <= BigInt(0) || amount > balance) throw new Error('출금할 예치 잔액을 확인하세요.');
  const remaining = balance - amount;
  if (remaining > BigInt(0) && remaining < minimum) throw new Error('출금 후 잔액은 최소 예치금 이상이어야 합니다. 전액 출금도 가능합니다.');
}
