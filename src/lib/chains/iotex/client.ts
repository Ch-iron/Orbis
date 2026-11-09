import { createPublicClient, http, type Address } from 'viem';
import { iotex } from 'viem/chains';
import { STAKING, STAKING_ABI } from './contracts';
export const iotexClient = createPublicClient({ chain: iotex, transport: http('https://babel-api.mainnet.iotex.io') });
export async function readIotexCandidates() {
  const all = [];
  for (let offset = 0; ; offset += 100) {
    const page = await iotexClient.readContract({ address: STAKING, abi: STAKING_ABI, functionName: 'candidates', args: [offset, 100] });
    all.push(...page);
    if (page.length < 100) return all;
  }
}
export async function readIotexBuckets(owner: Address) {
  const all = [];
  for (let offset = 0; ; offset += 100) {
    const page = await iotexClient.readContract({ address: STAKING, abi: STAKING_ABI, functionName: 'bucketsByVoter', args: [owner, offset, 100] });
    all.push(...page);
    if (page.length < 100) return all;
  }
}
export async function readIotexBucket(index: bigint) {
  const buckets = await iotexClient.readContract({ address: STAKING, abi: STAKING_ABI, functionName: 'bucketsByIndexes', args: [[index]] });
  if (buckets.length !== 1 || buckets[0].index !== index) throw new Error('IoTeX 예치를 찾을 수 없습니다.');
  return buckets[0];
}
export type IotexBucket = Awaited<ReturnType<typeof readIotexBucket>>;
