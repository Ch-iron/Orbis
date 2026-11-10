import type { Address } from 'viem';
import { sonicClient, readSonicPositions, readSonicWithdrawal } from '@/lib/chains/sonic/client';
import { STS, STS_ABI } from './contracts';

export async function readBeetsPosition(owner: Address) {
  const [available, receipt, rate, pool, depositPaused, undelegatePaused, poolPaused, withdrawPaused, delay, minimumDeposit, minimumUnstake, count, block] = await Promise.all([
    sonicClient.getBalance({ address: owner }),
    sonicClient.readContract({ address: STS, abi: STS_ABI, functionName: 'balanceOf', args: [owner] }),
    sonicClient.readContract({ address: STS, abi: STS_ABI, functionName: 'getRate' }),
    sonicClient.readContract({ address: STS, abi: STS_ABI, functionName: 'totalPool' }),
    sonicClient.readContract({ address: STS, abi: STS_ABI, functionName: 'depositPaused' }),
    sonicClient.readContract({ address: STS, abi: STS_ABI, functionName: 'undelegatePaused' }),
    sonicClient.readContract({ address: STS, abi: STS_ABI, functionName: 'undelegateFromPoolPaused' }),
    sonicClient.readContract({ address: STS, abi: STS_ABI, functionName: 'withdrawPaused' }),
    sonicClient.readContract({ address: STS, abi: STS_ABI, functionName: 'withdrawDelay' }),
    sonicClient.readContract({ address: STS, abi: STS_ABI, functionName: 'MIN_DEPOSIT' }),
    sonicClient.readContract({ address: STS, abi: STS_ABI, functionName: 'MIN_UNDELEGATE_AMOUNT_SHARES' }),
    sonicClient.readContract({ address: STS, abi: STS_ABI, functionName: 'userNumWithdraws', args: [owner] }),
    sonicClient.getBlock(),
  ]);
  const poolShares = await sonicClient.readContract({ address: STS, abi: STS_ABI, functionName: 'convertToShares', args: [pool] });
  const withdrawals = [];
  for (let start = BigInt(0); start < count; start += BigInt(25)) {
    const size = Number(count - start > BigInt(25) ? BigInt(25) : count - start);
    const page = await Promise.all(Array.from({ length: size }, async (_, i) => {
      const id = await sonicClient.readContract({ address: STS, abi: STS_ABI, functionName: 'userWithdraws', args: [owner, start + BigInt(i)] });
      const request = await sonicClient.readContract({ address: STS, abi: STS_ABI, functionName: 'getWithdrawRequest', args: [id] });
      const unlock = request.requestTimestamp + delay;
      const nativeReady = request.kind === 1 && !request.isWithdrawn ? (await readSonicWithdrawal(STS, request.validatorId, id)).ready : true;
      return { id, amount: request.assetAmount, unlock, withdrawn: request.isWithdrawn, ready: request.user.toLowerCase() === owner.toLowerCase() && !request.isWithdrawn && request.kind !== 2 && block.timestamp >= unlock && nativeReady };
    }));
    withdrawals.push(...page.filter((request) => !request.withdrawn));
  }
  return { available, receipt, rate, poolShares, depositPaused, undelegatePaused, poolPaused, withdrawPaused, delay, minimumDeposit, minimumUnstake, withdrawals };
}

export async function readBeetsCapacity() {
  const positions = await readSonicPositions(STS);
  return Promise.all(positions.filter((position) => position.amount > BigInt(0)).map(async (position) => ({
    id: position.id,
    shares: await sonicClient.readContract({ address: STS, abi: STS_ABI, functionName: 'convertToShares', args: [position.amount] }),
  })));
}
