import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
import * as viem from 'viem';
import * as near from '@near-wallet-selector/core';
function prepare(overrides = {}) {
  const unit = 10n ** 24n;
  const imports = { viem, '@near-wallet-selector/core': near,
    '@/lib/chains/near/client': { assertNearAccount: () => {} },
    './client': { LINEAR_CONTRACT: 'linear-protocol.near', readLinearPosition: async () => ({ available: 5n * unit, receipt: unit, staked: 2n * unit, unstaked: unit, canWithdraw: true, paused: false, ...overrides }) },
  };
  const context = { exports: {}, require: (name) => imports[name] };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/features/near-liquid-staking/actions.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, context);
  return (kind, amount) => context.exports.prepareLinearAction('owner.near', { kind, amount });
}
test('LiNEAR deposit attaches NEAR to the verified liquid staking contract', async () => {
  const transaction = await prepare()('stake', '1');
  assert.equal(transaction.receiverId, 'linear-protocol.near');
  assert.equal(transaction.actions[0].functionCall.methodName, 'deposit_and_stake');
  assert.equal(transaction.actions[0].functionCall.deposit, 10n ** 24n);
});
test('LiNEAR unstaking uses NEAR value, not a one-to-one liquid token amount', async () => {
  const transaction = await prepare()('unstake', '2');
  assert.equal(JSON.parse(new TextDecoder().decode(transaction.actions[0].functionCall.args)).amount, String(2n * 10n ** 24n));
  await assert.rejects(prepare()('unstake', '2.1'));
});
test('LiNEAR rejects empty, zero, negative, excessive precision and gas overspend', async () => {
  for (const amount of ['', '0', '-1', '1e2', '0.0000000000000000000000001', '5']) await assert.rejects(prepare()('stake', amount));
});
test('LiNEAR rejects paused operations', async () => {
  await assert.rejects(prepare({ paused: true })('stake', '1'));
});
test('LiNEAR withdrawal checks contract readiness and available unstaked balance', async () => {
  await assert.rejects(prepare({ canWithdraw: false })('withdraw', '1'));
  await assert.rejects(prepare()('withdraw', '2'));
  const transaction = await prepare()('withdraw', '1');
  assert.equal(transaction.actions[0].functionCall.methodName, 'withdraw');
  assert.equal(transaction.actions[0].functionCall.deposit, 0n);
});
