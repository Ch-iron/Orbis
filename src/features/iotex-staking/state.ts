import type { IotexBucket } from '@/lib/chains/iotex/client';
export function iotexBucketState(bucket: IotexBucket, now: bigint) {
  const unstaked = bucket.unstakeStartTime > BigInt(0);
  const maturity = bucket.stakeStartTime + BigInt(bucket.stakedDuration) * BigInt(86400);
  const withdrawAt = bucket.unstakeStartTime + BigInt(3 * 86400);
  return { unstaked, maturity, withdrawAt, canUnstake: !unstaked && !bucket.autoStake && now >= maturity, canWithdraw: unstaked && now >= withdrawAt };
}
