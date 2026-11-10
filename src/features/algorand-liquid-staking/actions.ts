import { AtomicTransactionComposer, makeEmptyTransactionSigner, makeAssetTransferTxnWithSuggestedParamsFromObject, modelsv2, waitForConfirmation, type TransactionSigner } from 'algosdk';
import { MainnetConsensusConfig, convertAlgoToXAlgoWhenImmediate, convertXAlgoToAlgo, prepareImmediateStakeTransactions, prepareUnstakeTransactions } from './sdk';
import { parseAlgoAmount } from '@/features/algorand-staking/plan';
import { xAlgoClient, readXAlgoPosition } from './client';

export type XAlgoAction = { kind: 'stake' | 'unstake'; amount: string };

export async function prepareXAlgoAction(owner: string, action: XAlgoAction) {
  const amount = parseAlgoAmount(action.amount);
  if (amount <= BigInt(0) || amount >= BigInt(2) ** BigInt(64)) throw new Error('Enter a positive amount within the Algorand transaction limit.');
  const [position, params] = await Promise.all([readXAlgoPosition(owner), xAlgoClient.getTransactionParams().do()]);
  if (params.genesisID !== 'mainnet-v1.0') throw new Error('The Algorand node is not on mainnet.');
  if (action.kind === 'stake' && !position.state.canImmediateStake) throw new Error('Immediate xALGO staking is paused.');
  if (action.kind === 'unstake' && amount > position.receipt) throw new Error('Insufficient xALGO balance.');
  const expected = action.kind === 'stake' ? convertAlgoToXAlgoWhenImmediate(amount, position.state) : convertXAlgoToAlgo(amount, position.state);
  const minimumReceived = expected * BigInt(995) / BigInt(1000);
  if (minimumReceived <= BigInt(0)) throw new Error('The amount is too small to receive tokens.');
  const transactions = action.kind === 'stake'
    ? prepareImmediateStakeTransactions(MainnetConsensusConfig, position.state, owner, owner, amount, minimumReceived, params)
    : prepareUnstakeTransactions(MainnetConsensusConfig, position.state, owner, owner, amount, minimumReceived, params);
  const optIn = action.kind === 'stake' && !position.optedIn;
  if (optIn) transactions.unshift(makeAssetTransferTxnWithSuggestedParamsFromObject({ sender: owner, receiver: owner, amount: 0, assetIndex: MainnetConsensusConfig.xAlgoId, suggestedParams: { ...params, flatFee: true, fee: 1000 } }));
  const required = transactions.reduce((sum, transaction) => sum + transaction.fee, BigInt(0)) + (action.kind === 'stake' ? amount : BigInt(0)) + (optIn ? BigInt(100_000) : BigInt(0));
  if (required > position.available) throw new Error('Insufficient ALGO for the amount, asset registration and transaction fees.');
  return { transactions, minimumReceived };
}

export async function executeXAlgoAction(owner: string, action: XAlgoAction, signer: TransactionSigner, check: () => void, onSubmitted: (ids: string[]) => void) {
  check();
  const prepared = await prepareXAlgoAction(owner, action);
  const composer = new AtomicTransactionComposer();
  for (const txn of prepared.transactions) composer.addTransaction({ txn, signer: makeEmptyTransactionSigner() });
  const group = composer.buildGroup().map((item) => item.txn);
  const simulated = await composer.simulate(xAlgoClient, new modelsv2.SimulateRequest({ txnGroups: [], allowEmptySignatures: true }));
  const failure = simulated.simulateResponse.txnGroups.find((item) => item.failureMessage);
  if (failure) throw new Error(failure.failureMessage);
  check();
  const signed = await signer(group, group.map((_, index) => index));
  check();
  if (signed.length !== group.length) throw new Error('The wallet did not sign the complete xALGO transaction group.');
  const sent = await xAlgoClient.sendRawTransaction(signed).do();
  onSubmitted(group.map((txn) => txn.txID()));
  await waitForConfirmation(xAlgoClient, sent.txid, 20);
  return group.map((txn) => txn.txID());
}
