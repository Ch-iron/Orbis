import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as viem from 'viem';
import * as utils from '@mysten/sui/utils';
const owner = '0x' + '1'.repeat(64);
function setup(overrides = {}) {
  const calls = [];
  class Transaction {
    gas = 'gas'; pure = { u64: (v) => v, address: (v) => v };
    setSender() {} object(v) { return v; } splitCoins(coin, amounts) { calls.push({ coin, amounts }); return ['split']; }
    mergeCoins() {} moveCall(call) { calls.push(call); } async build() { return new Uint8Array([1]); }
  }
  const imports = { viem, '@mysten/sui/utils': utils, '@mysten/sui/transactions': { Transaction },
    '@/lib/chains/sui/client': { suiClient: { core: { simulateTransaction: async () => overrides.simulation ?? { $kind: 'Transaction', gasPaymentMocked: false } } } },
    './client': { HAEDAL_PACKAGE: 'package', HAEDAL_STAKING: 'staking', readHaedalPosition: async () => {
      if (overrides.fail) throw new Error('RPC failed');
      return { available: 5_000_000_000n, receipt: 3_000_000_000n, epoch: 10n, tickets: [{ objectId: 'ticket', claimEpoch: 10n }], ...overrides };
    }, readHaedalCoins: async () => [{ objectId: 'coin', balance: '3000000000' }] },
  };
  const context = { exports: {}, require: (name) => imports[name] };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/features/sui-liquid-staking/actions.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, context);
  return { prepare: (action) => context.exports.prepareHaedalAction(owner, action), calls };
}
test('Haedal stake splits only requested SUI and calls the protocol entry', async () => {
  const s = setup(); await s.prepare({ kind: 'stake', amount: '1' });
  assert.equal(s.calls.at(-1).target, 'package::interface::request_stake');
  assert.equal(s.calls[0].amounts[0], 1_000_000_000n);
});
test('Haedal rejects empty, zero, precision overflow and insufficient native balance', async () => {
  for (const amount of ['', '0', '-1', '0.0000000001', '6']) await assert.rejects(setup().prepare({ kind: 'stake', amount }));
});
test('Haedal delayed withdrawal consumes haSUI instead of SUI', async () => {
  const s = setup(); await s.prepare({ kind: 'unstake', amount: '2' });
  assert.equal(s.calls[0].coin, 'coin');
  assert.equal(s.calls.at(-1).target, 'package::interface::request_unstake_delay');
  await assert.rejects(setup().prepare({ kind: 'unstake', amount: '4' }));
});
test('Haedal claims only owned tickets whose epoch has arrived', async () => {
  await assert.rejects(setup().prepare({ kind: 'claim', objectId: 'other' }));
  await assert.rejects(setup({ epoch: 9n }).prepare({ kind: 'claim', objectId: 'ticket' }));
  const s = setup(); await s.prepare({ kind: 'claim', objectId: 'ticket' });
  assert.equal(s.calls.at(-1).target, 'package::interface::claim_v2');
});
test('Haedal rejects failed reads, failed simulation and mocked gas payment', async () => {
  for (const overrides of [{ fail: true }, { simulation: { $kind: 'FailedTransaction' } }, { simulation: { $kind: 'Transaction', gasPaymentMocked: true } }]) await assert.rejects(setup(overrides).prepare({ kind: 'stake', amount: '1' }));
});
