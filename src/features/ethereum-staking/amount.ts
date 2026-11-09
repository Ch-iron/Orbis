import { parseEther } from 'viem';

export function parseStakeAmount(input: string) {
  if (!/^\d+(\.\d{1,18})?$/.test(input)) {
    throw new Error('Enter a decimal amount with at most 18 decimal places.');
  }
  const amount = parseEther(input);
  if (amount <= BigInt(0)) throw new Error('Amount must be greater than zero.');
  return amount;
}
