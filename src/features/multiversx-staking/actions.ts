import { Transaction } from '@multiversx/sdk-core/out/core/transaction';
import { Address } from '@multiversx/sdk-core/out/core/address';
import { DelegationTransactionsFactory } from '@multiversx/sdk-core/out/delegation/delegationTransactionsFactory';
import { TransactionsFactoryConfig } from '@multiversx/sdk-core/out/core/transactionsFactoryConfig';
import { assertMultiversxSimulation } from './simulation';
import { parseUnits } from 'viem';
import { multiversxClient, readMultiversxPosition, readMultiversxProviders } from '@/lib/chains/multiversx/client';
export type MultiversxAction = { kind: 'delegate' | 'undelegate'; contract: string; amount: string } | { kind: 'withdraw' | 'claim' | 'compound'; contract: string };
export async function prepareMultiversxAction(owner: string, action: MultiversxAction) {
  const sender = Address.newFromBech32(owner);
  const delegationContract = Address.newFromBech32(action.contract);
  const providers = await readMultiversxProviders();
  if (!providers.some((provider) => provider.provider === action.contract)) throw new Error('Select a registered MultiversX delegation contract.');
  let amount = BigInt(0);
  if ('amount' in action) {
    if (!/^\d+(\.\d{1,18})?$/.test(action.amount)) throw new Error('Enter an amount with up to 18 decimal places.');
    amount = parseUnits(action.amount, 18);
    if (amount <= BigInt(0)) throw new Error('The amount must be greater than zero.');
  }
  if (action.kind !== 'delegate') {
    const position = await readMultiversxPosition(action.contract, owner);
    if (action.kind === 'undelegate' && amount > position.active) throw new Error('The amount exceeds the staked balance.');
    if (action.kind === 'withdraw' && position.withdrawable === BigInt(0)) throw new Error('No funds are currently available to withdraw.');
    if ((action.kind === 'claim' || action.kind === 'compound') && position.rewards === BigInt(0)) throw new Error('No rewards are available to claim.');
  }
  const factory = new DelegationTransactionsFactory({ config: new TransactionsFactoryConfig({ chainID: '1' }) });
  const transaction = await (() => {
    switch (action.kind) {
      case 'delegate': return factory.createTransactionForDelegating(sender, { delegationContract, amount });
      case 'undelegate': return factory.createTransactionForUndelegating(sender, { delegationContract, amount });
      case 'withdraw': return factory.createTransactionForWithdrawing(sender, { delegationContract });
      case 'claim': return factory.createTransactionForClaimingRewards(sender, { delegationContract });
      case 'compound': return factory.createTransactionForRedelegatingRewards(sender, { delegationContract });
    }
  })();
  const account = await multiversxClient.getAccount(sender);
  transaction.nonce = account.nonce;
  if (transaction.value + transaction.gasLimit * transaction.gasPrice > account.balance) throw new Error('Insufficient balance for the transaction amount and gas fees.');
  // The node requires a signature-sized field even when signature checks are disabled.
  const simulationTransaction = Transaction.newFromPlainObject(transaction.toPlainObject());
  simulationTransaction.signature = new Uint8Array(64);
  const simulation = await multiversxClient.simulateTransaction(simulationTransaction, false);
  assertMultiversxSimulation(simulation.raw);
  return transaction;
}
