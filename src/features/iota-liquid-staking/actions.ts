import { Transaction } from '@iota/iota-sdk/transactions';
import { isValidIotaAddress } from '@iota/iota-sdk/utils';
import { parseUnits } from 'viem';
import { iotaClient } from '@/lib/chains/iota/client';
import { SWIRL_PACKAGE, SWIRL_POOL, SWIRL_METADATA, readSwirlPosition, readSwirlCoins } from './client';

export type SwirlAction = { kind: 'stake' | 'unstake'; amount: string };

export async function prepareSwirlAction(owner: string, action: SwirlAction) {
  if (!isValidIotaAddress(owner)) throw new Error('Invalid IOTA wallet address.');
  if (!/^\d+(\.\d{1,9})?$/.test(action.amount)) throw new Error('Enter an amount with up to 9 decimal places.');
  const amount = parseUnits(action.amount, 9);
  if (amount <= BigInt(0) || amount >= BigInt(2) ** BigInt(64)) throw new Error('Enter a positive amount within the IOTA transaction limit.');
  const position = await readSwirlPosition(owner);
  const transaction = new Transaction();
  transaction.setSender(owner);
  const pool = transaction.object(SWIRL_POOL), metadata = transaction.object(SWIRL_METADATA), system = transaction.object('0x5');
  if (action.kind === 'stake') {
    if (amount >= position.available) throw new Error('Leave enough IOTA for gas.');
    const [coin] = transaction.splitCoins(transaction.gas, [transaction.pure.u64(amount)]);
    transaction.moveCall({ target: `${SWIRL_PACKAGE}::native_pool::stake`, arguments: [pool, metadata, system, coin] });
  } else {
    if (amount > position.receipt) throw new Error('Insufficient stIOTA balance.');
    const coin = await takeStIota(transaction, owner, amount);
    transaction.moveCall({ target: `${SWIRL_PACKAGE}::native_pool::unstake`, arguments: [pool, system, metadata, coin] });
  }
  const bytes = await transaction.build({ client: iotaClient });
  const result = await iotaClient.dryRunTransactionBlock({ transactionBlock: bytes });
  if (result.effects.status.status !== 'success') throw new Error(result.effects.status.error ?? 'Swirl transaction simulation failed.');
  return transaction;
}

async function takeStIota(transaction: Transaction, owner: string, amount: bigint) {
  const coins = await readSwirlCoins(owner);
  const selected = [];
  let balance = BigInt(0);
  for (const coin of coins) {
    selected.push(coin); balance += BigInt(coin.balance);
    if (balance >= amount) break;
  }
  if (!selected.length || balance < amount) throw new Error('Insufficient spendable stIOTA coins.');
  const primary = transaction.object(selected[0].coinObjectId);
  if (selected.length > 1) transaction.mergeCoins(primary, selected.slice(1).map((coin) => transaction.object(coin.coinObjectId)));
  return transaction.splitCoins(primary, [transaction.pure.u64(amount)])[0];
}
