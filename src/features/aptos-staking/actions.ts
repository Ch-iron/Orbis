import { parseUnits } from 'viem';
import { aptosClient, aptosAddress, readAptosStake, readAptosValidators } from '@/lib/chains/aptos/client';
import type { InputTransactionData } from '@aptos-labs/wallet-adapter-react';

export type AptosAction = { kind: 'add_stake' | 'unlock' | 'reactivate_stake' | 'withdraw'; pool: string; amount: string };

export async function prepareAptosAction(owner: string, action: AptosAction): Promise<InputTransactionData> {
  aptosAddress(owner);
  const pool = aptosAddress(action.pool);
  if (!/^\d+(\.\d{1,8})?$/.test(action.amount)) throw new Error('수량은 소수점 8자리 이내로 입력하세요.');
  const amount = parseUnits(action.amount, 8);
  if (amount <= BigInt(0) || amount > BigInt('18446744073709551615')) throw new Error('수량이 허용 범위를 벗어납니다.');
  if (action.kind === 'add_stake') {
    const validators = await readAptosValidators();
    if (!validators.some((item) => item.address === pool && item.status === 'active')) throw new Error('활성 위임 풀을 선택하세요.');
  } else {
    const stake = await readAptosStake(pool, owner);
    const available = action.kind === 'unlock' ? stake.active : action.kind === 'reactivate_stake' ? stake.pending : stake.inactive;
    if (amount > available) throw new Error('해당 상태에서 사용할 수 있는 예치 잔액을 초과했습니다.');
  }
  const data: InputTransactionData = { data: { function: `0x1::delegation_pool::${action.kind}`, functionArguments: [pool, amount.toString()] } };
  const transaction = await aptosClient.transaction.build.simple({ sender: owner, data: data.data });
  const [simulation] = await aptosClient.transaction.simulate.simple({ transaction });
  if (!simulation?.success) throw new Error(simulation?.vm_status ?? 'Aptos 거래 시뮬레이션에 실패했습니다.');
  return data;
}
