import { nearView, readNearBalance, readNearPosition } from '@/lib/chains/near/client';

export const LINEAR_CONTRACT = 'linear-protocol.near';

export async function readLinearPosition(owner: string) {
  const [available, receipt, position, price, paused] = await Promise.all([
    readNearBalance(owner),
    nearView<string>(LINEAR_CONTRACT, 'ft_balance_of', { account_id: owner }),
    readNearPosition(LINEAR_CONTRACT, owner),
    nearView<string>(LINEAR_CONTRACT, 'ft_price', {}),
    nearView<boolean>(LINEAR_CONTRACT, 'is_paused', {}),
  ]);
  if (!/^\d+$/.test(receipt) || !/^\d+$/.test(price) || BigInt(price) === BigInt(0) || typeof paused !== 'boolean') {
    throw new Error('Invalid LiNEAR contract response.');
  }
  return { available: BigInt(available), receipt: BigInt(receipt), price: BigInt(price), paused, ...position };
}
