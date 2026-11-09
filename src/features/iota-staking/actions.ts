import { Transaction } from '@iota/iota-sdk/transactions';
import { isValidIotaAddress, normalizeIotaAddress, IOTA_SYSTEM_STATE_OBJECT_ID } from '@iota/iota-sdk/utils';
import { parseUnits } from 'viem';
import { iotaClient, readIotaPositions, readIotaValidators } from '@/lib/chains/iota/client';

export type IotaAction = { kind: 'stake'; validator: string; amount: string } | { kind: 'withdraw'; objectId: string };

export async function prepareIotaAction(owner: string, action: IotaAction) {
  if (!isValidIotaAddress(owner)) throw new Error('IOTA 지갑 주소가 올바르지 않습니다.');
  const transaction = new Transaction();
  transaction.setSender(owner);
  if (action.kind === 'stake') {
    if (!/^\d+(\.\d{1,9})?$/.test(action.amount)) throw new Error('수량은 소수점 9자리 이내로 입력하세요.');
    const amount = parseUnits(action.amount, 9);
    if (amount <= BigInt(0)) throw new Error('수량은 0보다 커야 합니다.');
    const validators = await readIotaValidators();
    if (!validators.some((validator) => validator.address === normalizeIotaAddress(action.validator))) throw new Error('현재 활성 검증자를 선택하세요.');
    const [coin] = transaction.splitCoins(transaction.gas, [transaction.pure.u64(amount)]);
    transaction.moveCall({ target: '0x3::iota_system::request_add_stake', arguments: [transaction.object(IOTA_SYSTEM_STATE_OBJECT_ID), coin, transaction.pure.address(action.validator)] });
  } else {
    const positions = await readIotaPositions(owner);
    const position = positions.find((item) => item.objectId === action.objectId);
    if (!position) throw new Error('이 지갑이 소유한 예치 객체가 아닙니다.');
    const state = await iotaClient.getLatestIotaSystemState();
    if (BigInt(state.epoch) < position.activationEpoch) throw new Error('예치한 에포크에는 출금할 수 없습니다. 다음 에포크를 기다리세요.');
    transaction.moveCall({ target: '0x3::iota_system::request_withdraw_stake', arguments: [transaction.object(IOTA_SYSTEM_STATE_OBJECT_ID), transaction.object(action.objectId)] });
  }
  const bytes = await transaction.build({ client: iotaClient });
  const simulation = await iotaClient.dryRunTransactionBlock({ transactionBlock: bytes });
  if (simulation.effects.status.status !== 'success') throw new Error(simulation.effects.status.error ?? 'IOTA 거래 시뮬레이션에 실패했습니다.');
  return transaction;
}
