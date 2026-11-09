import { encodeFunctionData, parseEther, type Address } from 'viem';
import { parseStakeAmount } from '@/features/ethereum-staking/amount';
import { iotexClient, readIotexBucket, readIotexCandidates } from '@/lib/chains/iotex/client';
import { iotexBucketState } from './state';
import { STAKING, STAKING_ABI } from '@/lib/chains/iotex/contracts';
export type IotexAction = { kind: 'stake'; candidate: string; amount: string; days: number; autoStake: boolean } | { kind: 'unlock' | 'unstake' | 'withdraw'; index: bigint };
export async function prepareIotexAction(owner: Address, action: IotexAction) {
  let data;
  if (action.kind === 'stake') {
    const amount = parseStakeAmount(action.amount);
    if (amount < parseEther('100')) throw new Error('최소 예치 수량은 100 IOTX입니다.');
    if (!Number.isInteger(action.days) || action.days < 0 || action.days > 1050) throw new Error('예치 기간은 0–1050일의 정수로 입력하세요.');
    const candidates = await readIotexCandidates();
    if (!candidates.some((item) => item.name === action.candidate && item.selfStakingTokens >= parseEther('1200000'))) throw new Error('활성 검증자를 선택하세요.');
    if (await iotexClient.getBalance({ address: owner }) <= amount) throw new Error('예치 금액과 가스비를 지불할 잔액이 부족합니다.');
    // IIP-12 takes the native debit from calldata, not transaction.value.
    data = encodeFunctionData({ abi: STAKING_ABI, functionName: 'createStake', args: [action.candidate, amount, action.days, action.autoStake, []] });
  } else {
    const bucket = await readIotexBucket(action.index);
    if (bucket.owner.toLowerCase() !== owner.toLowerCase()) throw new Error('연결된 계정의 예치가 아닙니다.');
    const block = await iotexClient.getBlock();
    const state = iotexBucketState(bucket, block.timestamp);
    if (action.kind === 'unlock') {
      if (!bucket.autoStake || state.unstaked) throw new Error('자동 잠금 중인 예치만 잠금을 해제할 수 있습니다.');
      data = encodeFunctionData({ abi: STAKING_ABI, functionName: 'restake', args: [action.index, bucket.stakedDuration, false, []] });
    } else {
      if (action.kind === 'unstake' ? !state.canUnstake : !state.canWithdraw) throw new Error('예치 기간 또는 출금 대기 기간이 끝나지 않았습니다.');
      data = encodeFunctionData({ abi: STAKING_ABI, functionName: action.kind === 'unstake' ? 'unstake' : 'withdrawStake', args: [action.index, []] });
    }
  }
  return [{ to: STAKING, data, value: BigInt(0) }];
}
