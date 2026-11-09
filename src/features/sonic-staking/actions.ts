import { encodeFunctionData } from 'viem';
import type { Address } from 'viem';
import { SFC, SFC_ABI } from '@/lib/chains/sonic/contracts';
import { sonicClient, readSonicWithdrawal } from '@/lib/chains/sonic/client';
import { parseStakeAmount } from '@/features/ethereum-staking/amount';
import type { StakingTransaction } from '@/features/ethereum-staking/plan';

export type SonicAction =
  | { kind: 'delegate' | 'undelegate'; validatorId: bigint; amount: string; requestId?: bigint }
  | { kind: 'claimRewards' | 'restakeRewards'; validatorId: bigint }
  | { kind: 'withdraw'; validatorId: bigint; requestId: bigint };

export async function prepareSonicAction(owner: Address, action: SonicAction): Promise<StakingTransaction[]> {
  if (action.validatorId <= BigInt(0)) throw new Error('검증자를 선택하세요.');
  if (action.kind === 'delegate') {
    const amount = parseStakeAmount(action.amount);
    const validator = await sonicClient.readContract({ address: SFC, abi: SFC_ABI, functionName: 'getValidator', args: [action.validatorId] });
    if (validator[0] !== BigInt(0) || validator[4] === BigInt(0)) throw new Error('현재 위임할 수 없는 검증자입니다.');
    return [{ to: SFC, value: amount, data: encodeFunctionData({ abi: SFC_ABI, functionName: 'delegate', args: [action.validatorId] }) }];
  }
  if (action.kind === 'undelegate') {
    const amount = parseStakeAmount(action.amount);
    if (action.requestId === undefined || action.requestId <= BigInt(0)) throw new Error('해제 요청 번호가 필요합니다.');
    const [stake, existing] = await Promise.all([
      sonicClient.readContract({ address: SFC, abi: SFC_ABI, functionName: 'getStake', args: [owner, action.validatorId] }),
      readSonicWithdrawal(owner, action.validatorId, action.requestId),
    ]);
    if (amount > stake) throw new Error('예치 잔액보다 많이 해제할 수 없습니다.');
    if (existing.amount > BigInt(0)) throw new Error('이미 사용한 해제 요청 번호입니다.');
    return [{ to: SFC, value: BigInt(0), data: encodeFunctionData({ abi: SFC_ABI, functionName: 'undelegate', args: [action.validatorId, action.requestId, amount] }) }];
  }
  if (action.kind === 'withdraw') {
    const request = await readSonicWithdrawal(owner, action.validatorId, action.requestId);
    if (!request.ready) throw new Error('출금 가능한 시간 또는 에포크에 도달하지 않았습니다.');
    return [{ to: SFC, value: BigInt(0), data: encodeFunctionData({ abi: SFC_ABI, functionName: 'withdraw', args: [action.validatorId, action.requestId] }) }];
  }
  const rewards = await sonicClient.readContract({ address: SFC, abi: SFC_ABI, functionName: 'pendingRewards', args: [owner, action.validatorId] });
  if (rewards === BigInt(0)) throw new Error('수령할 보상이 없습니다.');
  return [{ to: SFC, value: BigInt(0), data: encodeFunctionData({ abi: SFC_ABI, functionName: action.kind, args: [action.validatorId] }) }];
}
