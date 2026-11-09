import { encodeFunctionData } from 'viem';
import type { Address } from 'viem';
import { ethereumClient, readEthereumPositions, readLidoLimits, readLidoWithdrawals, readRocketPool } from '@/lib/chains/ethereum/client';
import { LIDO_QUEUE, QUEUE_ABI, RETH, RETH_ABI } from '@/lib/chains/ethereum/contracts';
import { parseStakeAmount } from './amount';
import { planLidoDeposit, planLidoWithdrawal, planRocketDeposit, planRocketWithdrawal } from './plan';
import type { StakingTransaction } from './plan';

export type EthereumAction =
  | { type: 'lido-deposit' | 'lido-withdraw' | 'rocket-deposit' | 'rocket-withdraw'; amount: string }
  | { type: 'lido-claim'; requestId: bigint };

export async function prepareEthereumAction(owner: Address, action: EthereumAction): Promise<StakingTransaction[]> {
  if (action.type === 'lido-claim') {
    const requests = await readLidoWithdrawals(owner);
    const request = requests.find((entry) => entry.id === action.requestId);
    if (!request?.isFinalized) throw new Error('This withdrawal is not ready to claim.');
    return [{ to: LIDO_QUEUE, value: BigInt(0), data: encodeFunctionData({ abi: QUEUE_ABI, functionName: 'claimWithdrawal', args: [action.requestId] }) }];
  }
  const amount = parseStakeAmount(action.amount);
  const balances = await readEthereumPositions(owner);
  if (action.type === 'lido-deposit' || action.type === 'lido-withdraw') {
    const limits = await readLidoLimits(owner);
    return action.type === 'lido-deposit'
      ? planLidoDeposit(amount, balances.eth, limits.depositLimit)
      : planLidoWithdrawal(owner, amount, balances.steth, limits);
  }
  const pool = await readRocketPool();
  if (action.type === 'rocket-deposit') return planRocketDeposit(amount, balances.eth, pool);
  const ethValue = await ethereumClient.readContract({ address: RETH, abi: RETH_ABI, functionName: 'getEthValue', args: [amount] });
  return planRocketWithdrawal(amount, balances.reth, ethValue, pool.collateral);
}
