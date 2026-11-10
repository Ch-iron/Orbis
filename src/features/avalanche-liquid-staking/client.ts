import { createPublicClient, http, type Address } from 'viem';
import { avalanche } from 'viem/chains';
import { SAVAX, SAVAX_ABI } from './contracts';

export const benqiClient = createPublicClient({ chain: avalanche, transport: http() });

export async function readBenqiPosition(owner: Address) {
  const [available, receipt, rate, cooldown, redeemPeriod, paused, mintingPaused, pooled, cap, count, block] = await Promise.all([
    benqiClient.getBalance({ address: owner }),
    benqiClient.readContract({ address: SAVAX, abi: SAVAX_ABI, functionName: 'balanceOf', args: [owner] }),
    benqiClient.readContract({ address: SAVAX, abi: SAVAX_ABI, functionName: 'getPooledAvaxByShares', args: [BigInt(10) ** BigInt(18)] }),
    benqiClient.readContract({ address: SAVAX, abi: SAVAX_ABI, functionName: 'cooldownPeriod' }),
    benqiClient.readContract({ address: SAVAX, abi: SAVAX_ABI, functionName: 'redeemPeriod' }),
    benqiClient.readContract({ address: SAVAX, abi: SAVAX_ABI, functionName: 'paused' }),
    benqiClient.readContract({ address: SAVAX, abi: SAVAX_ABI, functionName: 'mintingPaused' }),
    benqiClient.readContract({ address: SAVAX, abi: SAVAX_ABI, functionName: 'totalPooledAvax' }),
    benqiClient.readContract({ address: SAVAX, abi: SAVAX_ABI, functionName: 'totalPooledAvaxCap' }),
    benqiClient.readContract({ address: SAVAX, abi: SAVAX_ABI, functionName: 'getUnlockRequestCount', args: [owner] }),
    benqiClient.getBlock(),
  ]);
  const withdrawals = [];
  for (let start = BigInt(0); start < count; start += BigInt(25)) {
    const size = Number(count - start > BigInt(25) ? BigInt(25) : count - start);
    withdrawals.push(...await Promise.all(Array.from({ length: size }, async (_, i) => {
      const id = start + BigInt(i);
      const [startedAt, shares] = await benqiClient.readContract({ address: SAVAX, abi: SAVAX_ABI, functionName: 'userUnlockRequests', args: [owner, id] });
      const unlock = startedAt + cooldown;
      const expires = unlock + redeemPeriod;
      return { id, startedAt, shares, unlock, expires, ready: block.timestamp > unlock && block.timestamp <= expires, expired: block.timestamp > expires };
    })));
  }
  return { available, receipt, rate, cooldown, redeemPeriod, paused, mintingPaused, capacity: cap > pooled ? cap - pooled : BigInt(0), withdrawals };
}
