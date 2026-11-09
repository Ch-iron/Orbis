import { encodeFunctionData, zeroAddress } from 'viem';
import type { Address, Hex } from 'viem';
import { STETH, STETH_ABI, LIDO_QUEUE, QUEUE_ABI, RETH, RETH_ABI, DEPOSIT_ABI } from '@/lib/chains/ethereum/contracts';

export type StakingTransaction = { to: Address; data: Hex; value: bigint };

export function planLidoDeposit(amount: bigint, balance: bigint, limit: bigint): StakingTransaction[] {
  validateBalance(amount, balance);
  if (amount > limit) throw new Error('Amount exceeds the current Lido deposit limit.');
  return [{ to: STETH, data: encodeFunctionData({ abi: STETH_ABI, functionName: 'submit', args: [zeroAddress] }), value: amount }];
}

export function planLidoWithdrawal(owner: Address, amount: bigint, balance: bigint, limits: { minWithdrawal: bigint; maxWithdrawal: bigint; allowance: bigint }): StakingTransaction[] {
  validateBalance(amount, balance);
  if (amount < limits.minWithdrawal || amount > limits.maxWithdrawal) {
    throw new Error('Amount is outside the Lido per-request withdrawal limits. Submit separate requests for larger amounts.');
  }
  const request: StakingTransaction = {
    to: LIDO_QUEUE, value: BigInt(0),
    data: encodeFunctionData({ abi: QUEUE_ABI, functionName: 'requestWithdrawals', args: [[amount], owner] }),
  };
  if (limits.allowance >= amount) return [request];
  return [{ to: STETH, value: BigInt(0), data: encodeFunctionData({ abi: STETH_ABI, functionName: 'approve', args: [LIDO_QUEUE, amount] }) }, request];
}

export function planRocketDeposit(amount: bigint, balance: bigint, pool: { depositAddress: Address; enabled: boolean; minimum: bigint; maximum: bigint }): StakingTransaction[] {
  validateBalance(amount, balance);
  if (!pool.enabled) throw new Error('Rocket Pool deposits are currently paused.');
  if (amount < pool.minimum || amount > pool.maximum) throw new Error('Amount is outside the current Rocket Pool deposit limits.');
  return [{ to: pool.depositAddress, value: amount, data: encodeFunctionData({ abi: DEPOSIT_ABI, functionName: 'deposit' }) }];
}

export function planRocketWithdrawal(amount: bigint, balance: bigint, ethValue: bigint, collateral: bigint): StakingTransaction[] {
  validateBalance(amount, balance);
  if (ethValue > collateral) throw new Error('Rocket Pool has insufficient ETH liquidity for this withdrawal.');
  return [{ to: RETH, value: BigInt(0), data: encodeFunctionData({ abi: RETH_ABI, functionName: 'burn', args: [amount] }) }];
}

function validateBalance(amount: bigint, balance: bigint) {
  if (amount <= BigInt(0)) throw new Error('Amount must be greater than zero.');
  if (amount > balance) throw new Error('Insufficient balance.');
}
