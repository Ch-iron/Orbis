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
  if (!providers.some((provider) => provider.provider === action.contract)) throw new Error('등록된 MultiversX 위임 계약을 선택하세요.');
  let amount = BigInt(0);
  if ('amount' in action) {
    if (!/^\d+(\.\d{1,18})?$/.test(action.amount)) throw new Error('수량은 소수점 18자리 이내로 입력하세요.');
    amount = parseUnits(action.amount, 18);
    if (amount <= BigInt(0)) throw new Error('수량은 0보다 커야 합니다.');
  }
  if (action.kind !== 'delegate') {
    const position = await readMultiversxPosition(action.contract, owner);
    if (action.kind === 'undelegate' && amount > position.active) throw new Error('예치 잔액을 초과했습니다.');
    if (action.kind === 'withdraw' && position.withdrawable === BigInt(0)) throw new Error('현재 출금 가능한 금액이 없습니다.');
    if ((action.kind === 'claim' || action.kind === 'compound') && position.rewards === BigInt(0)) throw new Error('수령 가능한 보상이 없습니다.');
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
  if (transaction.value + transaction.gasLimit * transaction.gasPrice > account.balance) throw new Error('거래 수량과 가스비를 지불할 잔액이 부족합니다.');
  // The node requires a signature-sized field even when signature checks are disabled.
  const simulationTransaction = Transaction.newFromPlainObject(transaction.toPlainObject());
  simulationTransaction.signature = new Uint8Array(64);
  const simulation = await multiversxClient.simulateTransaction(simulationTransaction, false);
  assertMultiversxSimulation(simulation.raw);
  return transaction;
}
