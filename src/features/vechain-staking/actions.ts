import { encodeFunctionData, type Address } from 'viem';
import { readVechainBalance, readVechainLevels, readVechainPosition, readVechainValidator, readVechainBlock } from '@/lib/chains/vechain/client';
import { STARGATE, STARGATE_ABI } from '@/lib/chains/vechain/contracts';
import { simulateVechainClauses, type VechainClause } from '@/lib/chains/vechain/transport';
export type VechainAction = { kind: 'stake'; levelId: number } | { kind: 'delegate'; tokenId: bigint; validator: Address } | { kind: 'exit' | 'unstake' | 'claim'; tokenId: bigint };
export async function prepareVechainAction(owner: Address, action: VechainAction) {
  const balance = await readVechainBalance(owner);
  if (balance.vtho === BigInt(0)) throw new Error('거래 수수료를 지불할 VTHO가 필요합니다.');
  let clause: VechainClause;
  if (action.kind === 'stake') {
    const level = (await readVechainLevels()).find((item) => item.id === action.levelId);
    if (!level || level.isX || level.supply >= BigInt(level.cap)) throw new Error('발급 가능한 예치 레벨을 선택하세요.');
    if (balance.vet < level.vetAmountRequiredToStake) throw new Error('예치할 VET 잔액이 부족합니다.');
    clause = { to: STARGATE, data: encodeFunctionData({ abi: STARGATE_ABI, functionName: 'stake', args: [level.id] }), value: level.vetAmountRequiredToStake.toString() };
  } else {
    const [position, block] = await Promise.all([readVechainPosition(action.tokenId), readVechainBlock()]);
    if (position.owner.toLowerCase() !== owner.toLowerCase()) throw new Error('연결된 계정의 NFT가 아닙니다.');
    if (action.kind === 'delegate' || action.kind === 'unstake') {
      if (BigInt(block.number) < position.maturity) throw new Error('NFT 준비 기간이 아직 끝나지 않았습니다.');
      if (position.delegation.status === 2) throw new Error('활성 위임을 종료한 뒤 진행하세요.');
    }
    if (action.kind === 'delegate') {
      const validator = await readVechainValidator(action.validator);
      if (![1, 2].includes(validator.status) || validator.exitBlock !== 4294967295) throw new Error('위임 가능한 검증자를 선택하세요.');
      clause = { to: STARGATE, data: encodeFunctionData({ abi: STARGATE_ABI, functionName: 'delegate', args: [action.tokenId, action.validator] }), value: '0' };
    } else {
      if (action.kind === 'exit' && (position.requestedExit || ![1, 2].includes(position.delegation.status))) throw new Error('종료할 위임이 없거나 이미 종료 요청 중입니다.');
      if (action.kind === 'claim' && position.rewards === BigInt(0)) throw new Error('수령 가능한 VTHO 보상이 없습니다.');
      const functionName = action.kind === 'exit' ? 'requestDelegationExit' : action.kind === 'claim' ? 'claimRewards' : 'unstake';
      clause = { to: STARGATE, data: encodeFunctionData({ abi: STARGATE_ABI, functionName, args: [action.tokenId] }), value: '0' };
    }
  }
  await simulateVechainClauses([clause], owner);
  return [clause];
}
