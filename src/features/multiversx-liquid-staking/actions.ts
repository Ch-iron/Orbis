import { Transaction } from '@multiversx/sdk-core/out/core/transaction';
import { Address } from '@multiversx/sdk-core/out/core/address';
import { Token, TokenTransfer } from '@multiversx/sdk-core/out/core/tokens';
import { SmartContractTransactionsFactory } from '@multiversx/sdk-core/out/smartContracts/smartContractTransactionsFactory';
import { TransactionsFactoryConfig } from '@multiversx/sdk-core/out/core/transactionsFactoryConfig';
import { parseStakeAmount } from '@/features/ethereum-staking/amount';
import { assertMultiversxSimulation } from '@/features/multiversx-staking/simulation';
import { multiversxClient } from '@/lib/chains/multiversx/client';
import { XOXNO_POOL, readXoxnoPosition } from './client';

export type XoxnoAction = { kind: 'stake' | 'unstake'; amount: string } | { kind: 'claim'; ticketId: string };

export async function prepareXoxnoAction(owner: string, action: XoxnoAction) {
  const sender = Address.newFromBech32(owner);
  const position = await readXoxnoPosition(owner);
  if (!position.active) throw new Error('XOXNO liquid staking is paused.');
  const factory = new SmartContractTransactionsFactory({ config: new TransactionsFactoryConfig({ chainID: '1' }) });
  const options = { contract: Address.newFromBech32(XOXNO_POOL), gasLimit: BigInt(30_000_000), arguments: [] };
  let transaction: Transaction;
  if (action.kind === 'claim') {
    const ticket = position.tickets.find((item) => item.id === action.ticketId);
    if (!ticket?.ready || ticket.amount <= BigInt(0)) throw new Error('This XOXNO withdrawal is not ready to claim.');
    transaction = await factory.createTransactionForExecute(sender, { ...options, function: 'withdraw', tokenTransfers: [new TokenTransfer({ token: new Token({ identifier: position.withdrawalToken, nonce: ticket.nonce }), amount: ticket.amount })] });
  } else {
    const amount = parseStakeAmount(action.amount);
    if (action.kind === 'unstake' && amount > position.receipt) throw new Error('Insufficient xEGLD balance.');
    transaction = action.kind === 'stake'
      ? await factory.createTransactionForExecute(sender, { ...options, function: 'delegate', nativeTransferAmount: amount })
      : await factory.createTransactionForExecute(sender, { ...options, function: 'unDelegate', tokenTransfers: [new TokenTransfer({ token: new Token({ identifier: position.token }), amount })] });
  }
  const account = await multiversxClient.getAccount(sender);
  transaction.nonce = account.nonce;
  if (transaction.value + transaction.gasLimit * transaction.gasPrice > account.balance) throw new Error('Insufficient EGLD for the amount and gas fees.');
  const simulationTransaction = Transaction.newFromPlainObject(transaction.toPlainObject());
  simulationTransaction.signature = new Uint8Array(64);
  const simulation = await multiversxClient.simulateTransaction(simulationTransaction, false);
  assertMultiversxSimulation(simulation.raw);
  return transaction;
}
