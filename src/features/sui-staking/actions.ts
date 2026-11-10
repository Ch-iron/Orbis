import { Transaction } from '@mysten/sui/transactions';
import { isValidSuiAddress, normalizeSuiAddress } from '@mysten/sui/utils';
import { parseUnits } from 'viem';
import { suiClient, readSuiPositions, readSuiValidators } from '@/lib/chains/sui/client';

export type SuiAction = { kind: 'stake'; validator: string; amount: string } | { kind: 'withdraw'; objectId: string };

export async function prepareSuiAction(owner: string, action: SuiAction) {
  if (!isValidSuiAddress(owner)) throw new Error('Invalid Sui wallet address.');
  const transaction = new Transaction();
  transaction.setSender(owner);
  if (action.kind === 'stake') {
    if (!/^\d+(\.\d{1,9})?$/.test(action.amount)) throw new Error('Enter an amount with up to 9 decimal places.');
    const amount = parseUnits(action.amount, 9);
    if (amount <= BigInt(0)) throw new Error('The amount must be greater than zero.');
    const validators = await readSuiValidators();
    if (!validators.some((validator) => validator.address === normalizeSuiAddress(action.validator))) throw new Error('Select an active validator.');
    const [coin] = transaction.splitCoins(transaction.gas, [transaction.pure.u64(amount)]);
    transaction.moveCall({ target: '0x3::sui_system::request_add_stake', arguments: [transaction.object('0x5'), coin, transaction.pure.address(action.validator)] });
  } else {
    const positions = await readSuiPositions(owner);
    if (!positions.some((position) => position.objectId === action.objectId)) throw new Error('This stake object does not belong to this wallet.');
    transaction.moveCall({ target: '0x3::sui_system::request_withdraw_stake', arguments: [transaction.object('0x5'), transaction.object(action.objectId)] });
  }
  const bytes = await transaction.build({ client: suiClient });
  const simulation = await suiClient.core.simulateTransaction({ transaction: bytes });
  if (simulation.$kind === 'FailedTransaction') throw new Error('Sui transaction simulation failed.');
  if (simulation.gasPaymentMocked) throw new Error('Could not verify the actual gas balance.');
  return { transaction, bytes };
}
