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
    if (amount < parseEther('100')) throw new Error('The minimum stake is 100 IOTX.');
    if (!Number.isInteger(action.days) || action.days < 0 || action.days > 1050) throw new Error('Enter a whole number of days from 0 to 1050.');
    const candidates = await readIotexCandidates();
    if (!candidates.some((item) => item.name === action.candidate && item.selfStakingTokens >= parseEther('1200000'))) throw new Error('Select an active validator.');
    if (await iotexClient.getBalance({ address: owner }) <= amount) throw new Error('Insufficient balance for the stake and gas fees.');
    // IIP-12 takes the native debit from calldata, not transaction.value.
    data = encodeFunctionData({ abi: STAKING_ABI, functionName: 'createStake', args: [action.candidate, amount, action.days, action.autoStake, []] });
  } else {
    const bucket = await readIotexBucket(action.index);
    if (bucket.owner.toLowerCase() !== owner.toLowerCase()) throw new Error('This stake does not belong to the connected account.');
    const block = await iotexClient.getBlock();
    const state = iotexBucketState(bucket, block.timestamp);
    if (action.kind === 'unlock') {
      if (!bucket.autoStake || state.unstaked) throw new Error('Only stakes with auto-stake enabled can have it disabled.');
      data = encodeFunctionData({ abi: STAKING_ABI, functionName: 'restake', args: [action.index, bucket.stakedDuration, false, []] });
    } else {
      if (action.kind === 'unstake' ? !state.canUnstake : !state.canWithdraw) throw new Error('The staking period or withdrawal waiting period has not ended.');
      data = encodeFunctionData({ abi: STAKING_ABI, functionName: action.kind === 'unstake' ? 'unstake' : 'withdrawStake', args: [action.index, []] });
    }
  }
  return [{ to: STAKING, data, value: BigInt(0) }];
}
