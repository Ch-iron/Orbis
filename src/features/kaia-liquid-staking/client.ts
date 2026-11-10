import { createPublicClient, http } from 'viem';
import type { Address } from 'viem';
import { kaia } from 'viem/chains';
import { STKAIA, STKAIA_ABI, LAIR_CONTROLLER_ABI } from './contracts';

export const lairClient = createPublicClient({ chain: kaia, transport: http() });

export async function readLairPosition(owner: Address) {
  const token = { address: STKAIA, abi: STKAIA_ABI };
  const [available, receipt, allowance, paused, rate, controllerAddress, block] = await Promise.all([
    lairClient.getBalance({ address: owner }),
    lairClient.readContract({ ...token, functionName: 'balanceOf', args: [owner] }),
    lairClient.readContract({ ...token, functionName: 'allowance', args: [owner, STKAIA] }),
    lairClient.readContract({ ...token, functionName: 'paused' }),
    lairClient.readContract({ ...token, functionName: 'getRatioNativeTokenByStakingToken', args: [BigInt(10) ** BigInt(18)] }),
    lairClient.readContract({ ...token, functionName: 'getNodeControllerAddress' }),
    lairClient.getBlock(),
  ]);
  const controller = { address: controllerAddress, abi: LAIR_CONTROLLER_ABI };
  const [nodeCount, withdrawalCount] = await Promise.all([
    lairClient.readContract({ ...controller, functionName: 'getNodeLength' }),
    lairClient.readContract({ ...controller, functionName: 'getUnstakeRequestInfoLength', args: [owner] }),
  ]);
  const nodes = [];
  const withdrawals = [];
  for (let page = BigInt(0); page * BigInt(100) < nodeCount; page++) {
    nodes.push(...await lairClient.readContract({ ...controller, functionName: 'getNodeInfos', args: [page + BigInt(1), BigInt(100)] }));
  }
  for (let page = BigInt(0); page * BigInt(100) < withdrawalCount; page++) {
    const items = await lairClient.readContract({ ...controller, functionName: 'getUnstakeInfos', args: [owner, page, BigInt(100)] });
    for (const [offset, item] of items.entries()) {
      if (item.state !== 2) continue;
      const unlockAt = item.unstakeTime + BigInt(7 * 24 * 60 * 60);
      withdrawals.push({ ...item, index: page * BigInt(100) + BigInt(offset), unlockAt, ready: block.timestamp > unlockAt });
    }
  }
  return { available, receipt, allowance, paused, rate, nodes, withdrawals };
}
