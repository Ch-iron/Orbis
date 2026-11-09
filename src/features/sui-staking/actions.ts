import { Transaction } from '@mysten/sui/transactions';
import { isValidSuiAddress, normalizeSuiAddress } from '@mysten/sui/utils';
import { parseUnits } from 'viem';
import { suiClient, readSuiPositions, readSuiValidators } from '@/lib/chains/sui/client';

export type SuiAction = { kind: 'stake'; validator: string; amount: string } | { kind: 'withdraw'; objectId: string };

export async function prepareSuiAction(owner: string, action: SuiAction) {
  if (!isValidSuiAddress(owner)) throw new Error('Sui 지갑 주소가 올바르지 않습니다.');
  const transaction = new Transaction();
  transaction.setSender(owner);
  if (action.kind === 'stake') {
    if (!/^\d+(\.\d{1,9})?$/.test(action.amount)) throw new Error('수량은 소수점 9자리 이내로 입력하세요.');
    const amount = parseUnits(action.amount, 9);
    if (amount <= BigInt(0)) throw new Error('수량은 0보다 커야 합니다.');
    const validators = await readSuiValidators();
    if (!validators.some((validator) => validator.address === normalizeSuiAddress(action.validator))) throw new Error('활성 검증자를 선택하세요.');
    const [coin] = transaction.splitCoins(transaction.gas, [transaction.pure.u64(amount)]);
    transaction.moveCall({ target: '0x3::sui_system::request_add_stake', arguments: [transaction.object('0x5'), coin, transaction.pure.address(action.validator)] });
  } else {
    const positions = await readSuiPositions(owner);
    if (!positions.some((position) => position.objectId === action.objectId)) throw new Error('이 지갑이 소유한 예치 객체가 아닙니다.');
    transaction.moveCall({ target: '0x3::sui_system::request_withdraw_stake', arguments: [transaction.object('0x5'), transaction.object(action.objectId)] });
  }
  const bytes = await transaction.build({ client: suiClient });
  const simulation = await suiClient.core.simulateTransaction({ transaction: bytes });
  if (simulation.$kind === 'FailedTransaction') throw new Error('Sui 거래 시뮬레이션에 실패했습니다.');
  if (simulation.gasPaymentMocked) throw new Error('실제 가스 잔액을 확인하지 못했습니다.');
  return { transaction, bytes };
}
