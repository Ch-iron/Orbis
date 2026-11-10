import type { Hex, PublicClient } from 'viem';

export async function waitForSuccessfulReceipt(client: Pick<PublicClient, 'waitForTransactionReceipt'>, hash: Hex) {
  let replaced = false;
  const receipt = await client.waitForTransactionReceipt({
    hash,
    onReplaced: ({ reason }) => { if (reason !== 'repriced') replaced = true; },
  });
  if (replaced) throw new Error('The transaction was cancelled or replaced. Check the explorer.');
  if (receipt.status !== 'success') throw new Error(`Transaction reverted: ${hash}`);
  return receipt;
}
