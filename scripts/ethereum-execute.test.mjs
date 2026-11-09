import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
const context = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/features/ethereum-staking/execute.ts','utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, context);
const { executeTransactions } = context.exports;
const transactions = [{ to: 'approval', data: '0x', value: 0n }, { to: 'withdrawal', data: '0x', value: 0n }];
function setup(overrides = {}) {
 const calls = [];
 return { calls, port: {
   checkAccount: async () => { calls.push('account'); },
   simulate: async tx => { calls.push(`simulate:${tx.to}`); },
   send: async tx => { calls.push(`send:${tx.to}`); return tx.to; },
   wait: async hash => { calls.push(`wait:${hash}`); return { status: 'success' }; },
   onSubmitted: () => {},
   onConfirmed: hash => calls.push(`confirmed:${hash}`), ...overrides,
 } };
}
test('approval is mined successfully before simulating withdrawal', async () => {
 const { calls, port } = setup();
 await executeTransactions(transactions, port);
 assert.deepEqual(calls, ['account','simulate:approval','account','send:approval','wait:approval','confirmed:approval','account','simulate:withdrawal','account','send:withdrawal','wait:withdrawal','confirmed:withdrawal']);
});
test('reverted approval prevents withdrawal and confirmation', async () => {
 const { calls, port } = setup({ wait: async () => ({ status: 'reverted' }) });
 await assert.rejects(executeTransactions(transactions, port), /reverted/);
 assert.ok(!calls.includes('send:withdrawal'));
 assert.ok(!calls.includes('confirmed:approval'));
});
test('account switch, simulation failure, rejection and receipt failure stop sequence', async () => {
 for (const key of ['checkAccount','simulate','send','wait']) {
  const { calls, port } = setup({ [key]: async () => { throw new Error(key); } });
  await assert.rejects(executeTransactions(transactions, port), new RegExp(key));
  assert.ok(!calls.includes('send:withdrawal'));
 }
});
