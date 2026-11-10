import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const owner = '0x0000000000000000000000000000000000000001';
function setup() {
 const calls = [];
 const client = { getBalance: async () => 0n, getBlock: async () => ({ timestamp: 700000n }), readContract: async ({ functionName, args }) => {
  calls.push([functionName, args]);
  if (functionName === 'getNodeControllerAddress') return owner;
  if (functionName === 'getNodeLength') return 101n;
  if (functionName === 'getUnstakeRequestInfoLength') return 101n;
  if (functionName === 'getNodeInfos') { if (args[0] < 1n) throw new Error('NodeController:: page must be greater than 0'); return [{ node: owner, isActive: true, index: args[0] }]; }
  if (functionName === 'getUnstakeInfos') return [{ index: 999n, amount: 1n, state: 2, unstakeTime: 0n }];
  return 0n;
 } };
 const c = { exports: {}, require: (n) => ({ viem: { createPublicClient: () => client, http() {} }, 'viem/chains': { kaia: {} }, './contracts': {} })[n] };
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/features/kaia-liquid-staking/client.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, c);
 return { calls, run: () => c.exports.readLairPosition(owner) };
}
test('Lair uses one-based node pages and zero-based withdrawal pages with account-local claim indices', async () => {
 const s = setup(); const position = await s.run();
 assert.deepEqual(s.calls.filter(([name]) => name === 'getNodeInfos').map(([, args]) => args[0]), [1n, 2n]);
 assert.deepEqual(s.calls.filter(([name]) => name === 'getUnstakeInfos').map(([, args]) => args[1]), [0n, 1n]);
 assert.equal(position.withdrawals[0].index, 0n); assert.equal(position.withdrawals[1].index, 100n);
});
