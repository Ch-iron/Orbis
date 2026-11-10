import { Transaction } from '@iota/iota-sdk/transactions';
import { isValidIotaAddress, normalizeIotaAddress, IOTA_SYSTEM_STATE_OBJECT_ID } from '@iota/iota-sdk/utils';
import { parseUnits } from 'viem';
import { iotaClient, readIotaPositions, readIotaValidators } from '@/lib/chains/iota/client';

export type IotaAction = { kind: 'stake'; validator: string; amount: string } | { kind: 'withdraw'; objectId: string };

export async function prepareIotaAction(owner: string, action: IotaAction) {
  if (!isValidIotaAddress(owner)) throw new Error('Invalid IOTA wallet address.');
  const transaction = new Transaction();
  transaction.setSender(owner);
  if (action.kind === 'stake') {
    if (!/^\d+(\.\d{1,9})?$/.test(action.amount)) throw new Error('Enter an amount with up to 9 decimal places.');
    const amount = parseUnits(action.amount, 9);
    if (amount <= BigInt(0)) throw new Error('The amount must be greater than zero.');
    const validators = await readIotaValidators();
    if (!validators.some((validator) => validator.address === normalizeIotaAddress(action.validator))) throw new Error('Select a currently active validator.');
    const [coin] = transaction.splitCoins(transaction.gas, [transaction.pure.u64(amount)]);
    transaction.moveCall({ target: '0x3::iota_system::request_add_stake', arguments: [transaction.object(IOTA_SYSTEM_STATE_OBJECT_ID), coin, transaction.pure.address(action.validator)] });
  } else {
    const positions = await readIotaPositions(owner);
    const position = positions.find((item) => item.objectId === action.objectId);
    if (!position) throw new Error('This stake object does not belong to this wallet.');
    const state = await iotaClient.getLatestIotaSystemState();
    if (BigInt(state.epoch) < position.activationEpoch) throw new Error('You cannot withdraw in the staking epoch. Wait for the next epoch.');
    transaction.moveCall({ target: '0x3::iota_system::request_withdraw_stake', arguments: [transaction.object(IOTA_SYSTEM_STATE_OBJECT_ID), transaction.object(action.objectId)] });
  }
  const bytes = await transaction.build({ client: iotaClient });
  const simulation = await iotaClient.dryRunTransactionBlock({ transactionBlock: bytes });
  if (simulation.effects.status.status !== 'success') throw new Error(simulation.effects.status.error ?? 'IOTA transaction simulation failed.');
  return transaction;
}
