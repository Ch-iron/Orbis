import type { Hex } from 'viem';
import type { StakingTransaction } from './plan';

type ExecutionPort = {
  checkAccount: () => Promise<void>;
  simulate: (transaction: StakingTransaction) => Promise<unknown>;
  send: (transaction: StakingTransaction) => Promise<Hex>;
  wait: (hash: Hex) => Promise<{ status: 'success' | 'reverted' }>;
  onSubmitted: (hash: Hex) => void;
  onConfirmed: (hash: Hex) => void;
};

export async function executeTransactions(transactions: StakingTransaction[], port: ExecutionPort) {
  for (const transaction of transactions) {
    await port.checkAccount();
    await port.simulate(transaction);
    await port.checkAccount();
    const hash = await port.send(transaction);
    port.onSubmitted(hash);
    const receipt = await port.wait(hash);
    if (receipt.status !== 'success') throw new Error(`Transaction reverted: ${hash}`);
    port.onConfirmed(hash);
  }
}
