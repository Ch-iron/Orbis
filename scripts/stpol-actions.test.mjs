import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as viem from 'viem';
const load = (path, imports) => { const c = { exports: {}, require: (n) => imports[n] }; vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, c); return c.exports; };
const unit = 10n ** 18n, owner = '0x0000000000000000000000000000000000000001';
function setup(overrides = {}) {
 const contracts = load('src/features/polygon-liquid-staking/contracts.ts', { viem });
 const position = { available: 10n * unit, receipt: 5n * unit, depositAllowance: 0n, withdrawalAllowance: 0n, status: 0, capacity: 10n * unit, minimumWithdrawal: unit, strategyData: ['0x'], claimable: unit, claimIds: [1n], batchIds: [2n], ...overrides };
 const prepare = load('src/features/polygon-liquid-staking/actions.ts', { viem, './contracts': contracts, './client': { readStpolPosition: async () => position }, '@/lib/chains/polygon/contracts': { POL: owner }, '@/features/ethereum-staking/amount': load('src/features/ethereum-staking/amount.ts', { viem }) }).prepareStpolAction;
 return { run: (action) => prepare(owner, action), contracts };
}
test('stPOL deposits approve exact POL and never enter an untracked deposit queue', async () => {
 const s = setup(); const tx = await s.run({ kind: 'stake', amount: '1' }); assert.equal(tx.length, 2);
 const call = viem.decodeFunctionData({ abi: s.contracts.PRIORITY_ABI, data: tx[1].data }); assert.equal(call.functionName, 'deposit'); assert.equal(call.args[1], false);
});
test('stPOL redemptions approve shares and allow the protocol withdrawal queue', async () => {
 const s = setup(); const tx = await s.run({ kind: 'unstake', amount: '2' }); const call = viem.decodeFunctionData({ abi: s.contracts.PRIORITY_ABI, data: tx[1].data }); assert.equal(call.functionName, 'withdraw'); assert.equal(call.args[4], false); assert.equal(call.args[5], true);
});
test('stPOL rejects invalid amounts, unavailable capacity, closed pools and excess balances', async () => {
 for (const amount of ['', '0', '-1', '11']) await assert.rejects(setup().run({ kind: 'stake', amount }));
 await assert.rejects(setup({ capacity: 0n }).run({ kind: 'stake', amount: '1' }));
 await assert.rejects(setup({ status: 2 }).run({ kind: 'unstake', amount: '2' }));
 await assert.rejects(setup().run({ kind: 'unstake', amount: '6' }));
});
test('stPOL claims freshly read finalized account withdrawals', async () => {
 const s = setup(); const [tx] = await s.run({ kind: 'claim' }); assert.equal(viem.decodeFunctionData({ abi: s.contracts.WITHDRAWAL_ABI, data: tx.data }).args[0][0], 1n);
 await assert.rejects(setup({ claimable: 0n, claimIds: [] }).run({ kind: 'claim' }));
});
