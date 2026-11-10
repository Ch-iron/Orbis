import { Transaction } from '@mysten/sui/transactions';
import { isValidSuiAddress } from '@mysten/sui/utils';
import { parseUnits } from 'viem';
import { suiClient } from '@/lib/chains/sui/client';
import { HAEDAL_PACKAGE, HAEDAL_STAKING, readHaedalCoins, readHaedalPosition } from './client';

export type HaedalAction = { kind: 'stake' | 'unstake'; amount: string } | { kind: 'claim'; objectId: string };

export async function prepareHaedalAction(owner: string, action: HaedalAction) {
  if (!isValidSuiAddress(owner)) throw new Error('Invalid Sui wallet address.');
  const position = await readHaedalPosition(owner);
  const transaction = new Transaction();
  transaction.setSender(owner);
  const staking = transaction.object(HAEDAL_STAKING);
  if (action.kind === 'claim') {
    const ticket = position.tickets.find((item) => item.objectId === action.objectId);
    if (!ticket) throw new Error('This withdrawal ticket does not belong to this wallet.');
    if (ticket.claimEpoch > position.epoch) throw new Error('This withdrawal ticket is still locked.');
    transaction.moveCall({ target: `${HAEDAL_PACKAGE}::interface::claim_v2`, arguments: [transaction.object('0x5'), staking, transaction.object(ticket.objectId)] });
  } else {
    if (!/^\d+(\.\d{1,9})?$/.test(action.amount)) throw new Error('Enter an amount with up to 9 decimal places.');
    const amount = parseUnits(action.amount, 9);
    if (amount <= BigInt(0) || amount >= BigInt(2) ** BigInt(64)) throw new Error('Enter a positive amount within the Sui transaction limit.');
    if (action.kind === 'stake') {
      if (amount >= position.available) throw new Error('Insufficient SUI balance including gas.');
      const [coin] = transaction.splitCoins(transaction.gas, [transaction.pure.u64(amount)]);
      transaction.moveCall({ target: `${HAEDAL_PACKAGE}::interface::request_stake`, arguments: [transaction.object('0x5'), staking, coin, transaction.pure.address('0x0')] });
    } else {
      if (amount > position.receipt) throw new Error('Insufficient haSUI balance.');
      const coin = await takeHaSui(transaction, owner, amount);
      transaction.moveCall({ target: `${HAEDAL_PACKAGE}::interface::request_unstake_delay`, arguments: [staking, transaction.object('0x6'), coin] });
    }
  }
  const bytes = await transaction.build({ client: suiClient });
  const simulation = await suiClient.core.simulateTransaction({ transaction: bytes });
  if (simulation.$kind === 'FailedTransaction') throw new Error('Haedal transaction simulation failed.');
  if (simulation.gasPaymentMocked) throw new Error('Could not verify the actual Sui gas balance.');
  return { transaction, bytes };
}

async function takeHaSui(transaction: Transaction, owner: string, amount: bigint) {
  const coins = await readHaedalCoins(owner);
  const selected = [];
  let balance = BigInt(0);
  for (const coin of coins) {
    selected.push(coin); balance += BigInt(coin.balance);
    if (balance >= amount) break;
  }
  if (!selected.length || balance < amount) throw new Error('Insufficient spendable haSUI coins.');
  const primary = transaction.object(selected[0].objectId);
  if (selected.length > 1) transaction.mergeCoins(primary, selected.slice(1).map((coin) => transaction.object(coin.objectId)));
  return transaction.splitCoins(primary, [transaction.pure.u64(amount)])[0];
}
