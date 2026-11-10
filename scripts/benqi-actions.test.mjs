import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as viem from 'viem';
const load = (path, imports) => { const c = { exports: {}, require: (n) => imports[n] }; vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, c); return c.exports; };
function setup(overrides = {}) {
 const contracts = load('src/features/avalanche-liquid-staking/contracts.ts', { viem });
 const position = { available: 5n * 10n ** 18n, receipt: 2n * 10n ** 18n, capacity: 3n * 10n ** 18n, paused: false, mintingPaused: false, withdrawals: [{ id: 0n, startedAt: 1n, shares: 10n ** 18n, ready: true }], ...overrides };
 const prepare = load('src/features/avalanche-liquid-staking/actions.ts', { viem, './contracts': contracts, './client': { readBenqiPosition: async () => position }, '@/features/ethereum-staking/amount': load('src/features/ethereum-staking/amount.ts', { viem }) }).prepareBenqiAction;
 return { run: (a) => prepare('0x0000000000000000000000000000000000000001', a), decode: (tx) => viem.decodeFunctionData({ abi: contracts.SAVAX_ABI, data: tx[0].data }) };
}
test('BENQI deposits AVAX and requests exact sAVAX unlock amounts', async () => {
 const s=setup(); assert.equal(s.decode(await s.run({ kind:'stake', amount:'1' })).functionName,'submit');
 assert.equal(s.decode(await s.run({ kind:'unstake', amount:'1' })).functionName,'requestUnlock');
});
test('BENQI refuses stale indexed requests and requests outside their claim window', async () => {
 await assert.rejects(setup().run({ kind:'claim', id:0n, startedAt:2n, shares:10n**18n }));
 await assert.rejects(setup({ withdrawals:[{ id:0n, startedAt:1n, shares:10n**18n, ready:false }] }).run({ kind:'claim', id:0n, startedAt:1n, shares:10n**18n }));
 const s=setup(); assert.equal(s.decode(await s.run({ kind:'claim', id:0n, startedAt:1n, shares:10n**18n })).functionName,'redeem');
});
test('BENQI rejects paused deposits, over-capacity deposits and insufficient sAVAX', async () => {
 await assert.rejects(setup({ mintingPaused:true }).run({kind:'stake',amount:'1'}));
 await assert.rejects(setup().run({kind:'stake',amount:'4'}));
 await assert.rejects(setup().run({kind:'unstake',amount:'3'}));
});
