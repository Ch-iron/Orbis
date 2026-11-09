import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
import * as viem from 'viem';
function load(path, imports) {
  const context = { exports: {}, require: name => { if (!(name in imports)) throw new Error(name); return imports[name]; } };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, context);
  return context.exports;
}
const contracts = load('src/lib/chains/ethereum/contracts.ts', { viem });
const { planLidoDeposit, planLidoWithdrawal, planRocketDeposit, planRocketWithdrawal } = load('src/features/ethereum-staking/plan.ts', { viem, '@/lib/chains/ethereum/contracts': contracts });
const owner = '0x0000000000000000000000000000000000000001';
const limits = { minWithdrawal: 100n, maxWithdrawal: 1000n, allowance: 0n };
test('Lido withdraw approval is exact and precedes request', () => {
  const plan = planLidoWithdrawal(owner, 500n, 1000n, limits);
  assert.equal(plan.length, 2);
  assert.equal(viem.decodeFunctionData({ abi: contracts.STETH_ABI, data: plan[0].data }).args[1], 500n);
  assert.equal(viem.decodeFunctionData({ abi: contracts.QUEUE_ABI, data: plan[1].data }).functionName, 'requestWithdrawals');
});
test('sufficient approval skips approval transaction', () => {
  assert.equal(planLidoWithdrawal(owner, 500n, 1000n, { ...limits, allowance: 500n }).length, 1);
});
test('Lido rejects zero, below minimum, above per-request maximum and insufficient balance', () => {
  for (const amount of [0n, 99n, 1001n]) assert.throws(() => planLidoWithdrawal(owner, amount, 2000n, limits));
  assert.throws(() => planLidoWithdrawal(owner, 500n, 499n, limits));
});
test('Lido deposit respects current limit and balance', () => {
  assert.equal(planLidoDeposit(500n, 1000n, 500n)[0].value, 500n);
  assert.throws(() => planLidoDeposit(500n, 499n, 1000n));
  assert.throws(() => planLidoDeposit(500n, 1000n, 499n));
});
const pool = { depositAddress: owner, enabled: true, minimum: 100n, maximum: 1000n, collateral: 1000n };
test('Rocket deposit uses resolved pool and enforces live limits', () => {
  assert.equal(planRocketDeposit(500n, 1000n, pool)[0].to, owner);
  assert.throws(() => planRocketDeposit(500n, 1000n, { ...pool, enabled: false }));
  for (const amount of [0n, 99n, 1001n]) assert.throws(() => planRocketDeposit(amount, 2000n, pool));
});
test('Rocket withdrawal compares ETH value against collateral, not raw rETH', () => {
  assert.throws(() => planRocketWithdrawal(500n, 500n, 1100n, 1000n));
  assert.equal(planRocketWithdrawal(500n, 500n, 1000n, 1000n).length, 1);
  assert.throws(() => planRocketWithdrawal(501n, 500n, 1000n, 1000n));
});
