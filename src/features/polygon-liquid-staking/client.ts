import { erc20Abi } from 'viem';
import type { Address, Hex } from 'viem';
import { polygonStakingClient } from '@/lib/chains/polygon/client';
import { POL } from '@/lib/chains/polygon/contracts';
import { STPOL, PRIORITY_POOL, WITHDRAWAL_POOL, STPOL_ABI, PRIORITY_ABI, WITHDRAWAL_ABI } from './contracts';

export async function readStpolPosition(owner: Address) {
  const client = polygonStakingClient;
  const [available, receipt, depositAllowance, withdrawalAllowance, status, queuedDeposits, depositRoom, queuedWithdrawals, pending, finalized, minimumWithdrawal, strategies] = await Promise.all([
    client.readContract({ address: POL, abi: erc20Abi, functionName: 'balanceOf', args: [owner] }),
    client.readContract({ address: STPOL, abi: erc20Abi, functionName: 'balanceOf', args: [owner] }),
    client.readContract({ address: POL, abi: erc20Abi, functionName: 'allowance', args: [owner, PRIORITY_POOL] }),
    client.readContract({ address: STPOL, abi: erc20Abi, functionName: 'allowance', args: [owner, PRIORITY_POOL] }),
    client.readContract({ address: PRIORITY_POOL, abi: PRIORITY_ABI, functionName: 'poolStatus' }),
    client.readContract({ address: PRIORITY_POOL, abi: PRIORITY_ABI, functionName: 'totalQueued' }),
    client.readContract({ address: STPOL, abi: STPOL_ABI, functionName: 'canDeposit' }),
    client.readContract({ address: WITHDRAWAL_POOL, abi: WITHDRAWAL_ABI, functionName: 'getTotalQueuedWithdrawals' }),
    client.readContract({ address: WITHDRAWAL_POOL, abi: WITHDRAWAL_ABI, functionName: 'getAccountTotalQueuedWithdrawals', args: [owner] }),
    client.readContract({ address: WITHDRAWAL_POOL, abi: WITHDRAWAL_ABI, functionName: 'getFinalizedWithdrawalIdsByOwner', args: [owner] }),
    client.readContract({ address: WITHDRAWAL_POOL, abi: WITHDRAWAL_ABI, functionName: 'minWithdrawalAmount' }),
    client.readContract({ address: STPOL, abi: STPOL_ABI, functionName: 'getStrategies' }),
  ]);
  const [claimIds, claimable] = finalized;
  const batchIds = claimIds.length ? await client.readContract({ address: WITHDRAWAL_POOL, abi: WITHDRAWAL_ABI, functionName: 'getBatchIds', args: [claimIds] }) : [];
  const strategyData: Hex[] = strategies.map(() => '0x');
  return { available, receipt, depositAllowance, withdrawalAllowance, status, capacity: queuedDeposits === BigInt(0) ? depositRoom + queuedWithdrawals : BigInt(0), pending, claimIds, claimable, batchIds, minimumWithdrawal, strategyData };
}
