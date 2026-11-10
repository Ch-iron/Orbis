import { AlgoAmount } from '@algorandfoundation/algokit-utils/types/amount';
import type { TransactionSigner } from 'algosdk';
import { createRetiClients } from '@/lib/chains/algorand/contracts';
import { readAlgorandAccount, readRetiPoolCapacity, readRetiPositions, readRetiRegistrationCost, readRetiValidators } from '@/lib/chains/algorand/client';
import { parseAlgoAmount, validateRetiDeposit, validateRetiWithdrawal } from './plan';

export type RetiAction = { kind: 'deposit'; validatorId: bigint; amount: string } | { kind: 'withdraw'; poolAppId: bigint; amount: string };

export async function executeRetiAction(action: RetiAction, owner: string, signer: TransactionSigner, assertWallet: () => void) {
  const prepared = await prepareRetiAction(action, owner, signer, assertWallet);
  assertWallet();
  const sent = await prepared.send({ populateAppCallResources: true });
  return sent.txIds;
}

export async function prepareRetiAction(action: RetiAction, owner: string, signer: TransactionSigner, assertWallet: () => void) {
  assertWallet();
  const amount = parseAlgoAmount(action.amount);
  const [validators, positions, account] = await Promise.all([readRetiValidators(), readRetiPositions(owner), readAlgorandAccount(owner)]);
  const position = action.kind === 'withdraw' ? positions.find((item) => item.poolAppId === action.poolAppId) : undefined;
  const validatorId = action.kind === 'deposit' ? action.validatorId : position?.validatorId;
  const validator = validators.find((item) => item.id === validatorId);
  if (!validator) throw new Error('Validator or stake information not found.');
  if (action.kind === 'deposit') validateRetiDeposit(validator, amount, positions.some((item) => item.validatorId === validator.id), Math.floor(Date.now() / 1000));
  if (action.kind === 'withdraw') {
    if (!position) throw new Error('No stake information found for this wallet.');
    validateRetiWithdrawal(amount, position.balance, validator.minimum);
  }
  const registration = action.kind === 'deposit' ? await readRetiRegistrationCost(owner) : BigInt(0);
  const paymentAmount = action.kind === 'deposit' ? amount + registration : BigInt(0);
  if (action.kind === 'deposit') {
    const target = await readRetiPoolCapacity(validator.id, owner, amount);
    if (target.full && !positions.some((item) => item.poolAppId === target.poolAppId)) throw new Error('The assigned pool is full. Select another validator.');
  }
  const optIn = validator.rewardTokenId > BigInt(0) && !account.assets.some((asset) => asset.assetId === validator.rewardTokenId);
  const guardedSigner: TransactionSigner = async (group, indexes) => {
    assertWallet();
    for (const index of indexes) {
      const txn = group[index];
      if (txn.sender.toString() !== owner || txn.genesisID !== 'mainnet-v1.0') throw new Error('The wallet address or Algorand network has changed.');
    }
    const fresh = await readAlgorandAccount(owner);
    const fees = group.reduce((total, txn) => total + txn.fee, BigInt(0));
    const required = paymentAmount + fees + (optIn ? BigInt(100_000) : BigInt(0));
    if (fresh.amount - fresh.minimumBalance < required) throw new Error('Insufficient balance for the stake, registration cost, and transaction fees.');
    assertWallet();
    return signer(group, indexes);
  };
  const { algorand, registry, pool } = createRetiClients(owner, guardedSigner);
  const app = action.kind === 'deposit' ? registry : pool(action.poolAppId);
  const build = async (simulation: boolean, extraFee = BigInt(0)) => {
    const group = algorand.newGroup();
    for (const note of ['1', '2']) group.addAppCallMethodCall(await app.params.call({ method: 'gas', args: [], note, ...(simulation && action.kind === 'withdraw' ? { staticFee: AlgoAmount.MicroAlgos(0) } : {}) }));
    const payment = action.kind === 'deposit' ? await algorand.createTransaction.payment({ sender: owner, receiver: registry.appAddress, amount: AlgoAmount.MicroAlgos(paymentAmount) }) : undefined;
    group.addAppCallMethodCall(await app.params.call({
      method: action.kind === 'deposit' ? 'addStake' : 'removeStake',
      args: action.kind === 'deposit' ? [{ txn: payment!, signer: guardedSigner }, validator.id, BigInt(0)] : [owner, amount],
      ...(simulation ? { staticFee: AlgoAmount.MicroAlgos(240_000) } : { extraFee: AlgoAmount.MicroAlgos(extraFee) }),
    }));
    if (optIn) group.addAssetOptIn({ sender: owner, assetId: validator.rewardTokenId });
    return group;
  };
  const simulated = await (await build(true)).simulate({ skipSignatures: true, allowUnnamedResources: true });
  const result = simulated.simulateResponse.txnGroups[0];
  if (result.failureMessage) throw new Error(result.failureMessage);
  if (result.appBudgetAdded === undefined) throw new Error('Could not calculate Réti transaction fees.');
  const extraFee = BigInt(1000 * Math.ceil(result.appBudgetAdded / 700) - (action.kind === 'deposit' ? 1000 : 2000));
  if (extraFee < BigInt(0)) throw new Error('Invalid Réti transaction fee response.');
  assertWallet();
  return build(false, extraFee);
}
