import { Address, beginCell, toNano } from '@ton/core';
import { tonAddress } from '@/lib/chains/ton/client';
import { TONSTAKERS_POOL, readTonstakersPosition } from './client';

export type TonstakersAction = { kind: 'stake' | 'unstake'; amount: string };

export async function prepareTonstakersAction(owner: string, action: TonstakersAction) {
  const account = Address.parse(owner);
  if (account.workChain !== 0) throw new Error('Connect a TON base workchain wallet.');
  if (!/^\d+(\.\d{1,9})?$/.test(action.amount)) throw new Error('Enter an amount with up to 9 decimal places.');
  const amount = toNano(action.amount);
  if (amount <= BigInt(0) || amount >= BigInt(2) ** BigInt(120)) throw new Error('Enter a positive TON amount within the transaction limit.');
  const position = await readTonstakersPosition(owner);
  if (action.kind === 'stake' && amount < position.minimumStake) throw new Error('The deposit is below the Tonstakers pool minimum.');
  const value = action.kind === 'stake' ? amount + toNano('1') : toNano('1.05');
  if (value + toNano('0.05') > position.available) throw new Error('Insufficient TON for the transfer and wallet gas reserve.');
  if (action.kind === 'unstake' && (amount > position.receipt || !position.jettonWallet)) throw new Error('Insufficient tsTON balance.');
  const target = action.kind === 'stake' ? TONSTAKERS_POOL : position.jettonWallet!;
  const body = action.kind === 'stake'
    ? beginCell().storeUint(0x47d54391, 32).storeUint(1, 64).storeUint(0, 64).endCell()
    : beginCell().storeUint(0x595f07bc, 32).storeUint(0, 64).storeCoins(amount).storeAddress(account).storeMaybeRef(beginCell().storeBit(false).storeBit(false).endCell()).endCell();
  return { validUntil: Math.floor(Date.now() / 1000) + 300, network: '-239' as const, from: tonAddress(owner), messages: [{ address: Address.parse(target).toString({ bounceable: true }), amount: value.toString(), payload: body.toBoc().toString('base64') }] };
}
