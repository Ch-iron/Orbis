import type { RetiValidator } from '@/lib/chains/algorand/decode';

export function parseAlgoAmount(input: string) {
  if (!/^\d+(\.\d{1,6})?$/.test(input)) throw new Error('Enter an amount with up to 6 decimal places.');
  const [whole, fraction = ''] = input.split('.');
  const amount = BigInt(whole) * BigInt(1_000_000) + BigInt(fraction.padEnd(6, '0'));
  if (amount <= BigInt(0)) throw new Error('The amount must be greater than zero.');
  return amount;
}

export function validateRetiDeposit(validator: RetiValidator, amount: bigint, existing: boolean, now: number) {
  if (validator.gatingType !== 0) throw new Error('This pool requires holding a specific asset. Use the official Réti app.');
  if (validator.sunsettingOn > BigInt(0) && validator.sunsettingOn <= BigInt(now)) throw new Error('This validator has ended operations.');
  if (validator.pools.length === 0) throw new Error('No operating pools found.');
  if (!existing && amount < validator.minimum) throw new Error('The amount is below the minimum validator stake.');
}

export function validateRetiWithdrawal(amount: bigint, balance: bigint, minimum: bigint) {
  if (amount <= BigInt(0) || amount > balance) throw new Error('Check the staked balance available to withdraw.');
  const remaining = balance - amount;
  if (remaining > BigInt(0) && remaining < minimum) throw new Error('The remaining balance must meet the minimum stake. You can also withdraw the full amount.');
}
