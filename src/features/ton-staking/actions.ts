import { Address, beginCell, toNano } from '@ton/core';
import { readTonBalance, readTonPool, readTonPools, readTonPosition, tonAddress } from '@/lib/chains/ton/client';
export type TonAction = { kind: 'stake'; pool: string; amount: string } | { kind: 'withdraw'; pool: string };
export async function prepareTonAction(owner: string, action: TonAction) {
  if (Address.parse(owner).workChain !== 0) throw new Error('TON 기본 워크체인 지갑을 연결하세요.');
  const pools = await readTonPools();
  if (!pools.some((pool) => tonAddress(pool.address) === tonAddress(action.pool))) throw new Error('지원하는 표준 TON nominator-pool을 선택하세요.');
  const [config, position, balance] = await Promise.all([readTonPool(action.pool), readTonPosition(action.pool, owner), readTonBalance(owner)]);
  let value = toNano('1');
  if (action.kind === 'stake') {
    if (!/^\d+(\.\d{1,9})?$/.test(action.amount)) throw new Error('수량은 소수점 9자리 이내로 입력하세요.');
    const amount = toNano(action.amount);
    if (amount <= BigInt(0) || amount < config.minStake) throw new Error('풀의 최소 예치 수량보다 적습니다.');
    if (config.count >= config.capacity && position.active + position.pending === BigInt(0)) throw new Error('풀의 참여 인원이 가득 찼습니다.');
    if (position.withdrawing) throw new Error('기존 출금 요청이 처리된 후 예치하세요.');
    value = amount + toNano('1');
  } else if (position.active + position.pending === BigInt(0) || position.withdrawing) throw new Error('출금할 예치가 없거나 이미 출금 요청 중입니다.');
  if (value + toNano('0.05') > balance) throw new Error('전송 금액과 가스비 여유분 0.05 TON을 지불할 잔액이 부족합니다.');
  const payload = beginCell().storeUint(0, 32).storeStringTail(action.kind === 'stake' ? 'd' : 'w').endCell().toBoc().toString('base64');
  return { validUntil: Math.floor(Date.now() / 1000) + 300, network: '-239' as const, from: tonAddress(owner), messages: [{ address: Address.parse(action.pool).toString({ bounceable: true }), amount: value.toString(), payload }] };
}
