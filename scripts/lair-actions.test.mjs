import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as viem from 'viem';
const load = (path, imports) => { const c = { exports: {}, require: (n) => imports[n] }; vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, c); return c.exports; };
const unit = 10n ** 18n, owner = '0x0000000000000000000000000000000000000001';
function setup(overrides = {}) {
 const contracts = load('src/features/kaia-liquid-staking/contracts.ts', { viem });
 const position = { available: 10n * unit, receipt: 5n * unit, allowance: 0n, paused: false, nodes: [{ node: owner, isActive: true }], withdrawals: [{ index: 2n, state: 2, ready: true }], ...overrides };
 const prepare = load('src/features/kaia-liquid-staking/actions.ts', { viem, './contracts': contracts, './client': { readLairPosition: async () => position }, '@/features/ethereum-staking/amount': load('src/features/ethereum-staking/amount.ts', { viem }) }).prepareLairAction;
 return { run: (action) => prepare(owner, action), decode: (tx) => viem.decodeFunctionData({ abi: contracts.STKAIA_ABI, data: tx.data }) };
}
test('Lair deposits native KAIA into the selected active node', async () => {
 const s = setup(); const [tx] = await s.run({ kind: 'stake', amount: '1', node: owner }); assert.equal(tx.value, unit); assert.equal(s.decode(tx).args[0], owner);
});
test('Lair withdrawal approves exact stKAIA and includes the selected node', async () => {
 const s = setup(); const tx = await s.run({ kind: 'unstake', amount: '2', node: owner }); assert.equal(tx.length, 2); assert.equal(s.decode(tx[0]).args[1], 2n * unit); assert.equal(s.decode(tx[1]).functionName, 'unstake');
});
test('Lair rejects invalid amounts, insufficient funds, paused and inactive nodes', async () => {
 for (const amount of ['', '0', '-1', '10']) await assert.rejects(setup().run({ kind: 'stake', amount, node: owner }));
 await assert.rejects(setup({ paused: true }).run({ kind: 'stake', amount: '1', node: owner }));
 await assert.rejects(setup({ nodes: [] }).run({ kind: 'stake', amount: '1', node: owner }));
 await assert.rejects(setup().run({ kind: 'unstake', amount: '6', node: owner }));
});
test('Lair claims only a ready withdrawal belonging to the current account', async () => {
 await assert.rejects(setup().run({ kind: 'claim', index: 1n }));
 await assert.rejects(setup({ withdrawals: [{ index: 2n, state: 2, ready: false }] }).run({ kind: 'claim', index: 2n }));
 const s = setup(); assert.equal(s.decode((await s.run({ kind: 'claim', index: 2n }))[0]).functionName, 'claim');
});
