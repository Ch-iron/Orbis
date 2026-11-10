import { Address, beginCell, toNano } from '@ton/core';
import { readTonBalance, readTonPool, readTonPools, readTonPosition, tonAddress } from '@/lib/chains/ton/client';
export type TonAction = { kind: 'stake'; pool: string; amount: string } | { kind: 'withdraw'; pool: string };
export async function prepareTonAction(owner: string, action: TonAction) {
  if (Address.parse(owner).workChain !== 0) throw new Error('Connect a TON base workchain wallet.');
  const pools = await readTonPools();
  if (!pools.some((pool) => tonAddress(pool.address) === tonAddress(action.pool))) throw new Error('Select a supported standard TON nominator-pool.');
  const [config, position, balance] = await Promise.all([readTonPool(action.pool), readTonPosition(action.pool, owner), readTonBalance(owner)]);
  let value = toNano('1');
  if (action.kind === 'stake') {
    if (!/^\d+(\.\d{1,9})?$/.test(action.amount)) throw new Error('Enter an amount with up to 9 decimal places.');
    const amount = toNano(action.amount);
    if (amount <= BigInt(0) || amount < config.minStake) throw new Error('The amount is below the minimum pool stake.');
    if (config.count >= config.capacity && position.active + position.pending === BigInt(0)) throw new Error('The pool has reached its participant limit.');
    if (position.withdrawing) throw new Error('Wait for the existing withdrawal request to complete before staking.');
    value = amount + toNano('1');
  } else if (position.active + position.pending === BigInt(0) || position.withdrawing) throw new Error('There is no stake to withdraw, or a withdrawal is already pending.');
  if (value + toNano('0.05') > balance) throw new Error('Insufficient balance for the transfer and the 0.05 TON gas reserve.');
  const payload = beginCell().storeUint(0, 32).storeStringTail(action.kind === 'stake' ? 'd' : 'w').endCell().toBoc().toString('base64');
  return { validUntil: Math.floor(Date.now() / 1000) + 300, network: '-239' as const, from: tonAddress(owner), messages: [{ address: Address.parse(action.pool).toString({ bounceable: true }), amount: value.toString(), payload }] };
}
