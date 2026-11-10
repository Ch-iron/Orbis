import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as viem from 'viem';
function setup(overrides = {}) {
 const imports = { viem, '@/lib/chains/aptos/client': { aptosAddress: (v) => v, aptosClient: { transaction: { build: { simple: async (v) => v }, simulate: { simple: async () => [{ success: !overrides.failed }] } } } }, './client': { AMNIS: '0xabc', readAmnisPosition: async () => ({ available: 500000000n, receipt: 200000000n, amapt: 100000000n, timestamp: 1000n, tickets: [{ address: 'ticket', unlock: 999n }], ...overrides }) } };
 const c = { exports: {}, require: (n) => imports[n] };
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/features/aptos-liquid-staking/actions.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, c);
 return (action) => c.exports.prepareAmnisAction('owner', action);
}
test('Amnis direct deposit receives reward-bearing stAPT at the sender address', async () => {
 const tx = await setup()({ kind: 'stake', amount: '1' }); assert.equal(tx.data.function, '0xabc::router::deposit_and_stake_entry'); assert.deepEqual(Array.from(tx.data.functionArguments), ['100000000', 'owner']);
});
test('Amnis unstaking and requesting APT withdrawal are distinct token operations', async () => {
 assert.equal((await setup()({ kind: 'unstake', amount: '1' })).data.function, '0xabc::router::unstake_entry');
 assert.equal((await setup()({ kind: 'redeem', amount: '1' })).data.function, '0xabc::router::request_withdrawal_entry');
 await assert.rejects(setup()({ kind: 'redeem', amount: '2' }));
});
test('Amnis rejects invalid amounts, insufficient balance and failed simulation', async () => {
 for (const amount of ['', '0', '-1', '0.000000001', '5']) await assert.rejects(setup()({ kind: 'stake', amount }));
 await assert.rejects(setup({ failed: true })({ kind: 'stake', amount: '1' }));
});
test('Amnis claims only owned unlocked withdrawal objects', async () => {
 await assert.rejects(setup()({ kind: 'claim', ticket: 'other' }));
 await assert.rejects(setup({ timestamp: 998n })({ kind: 'claim', ticket: 'ticket' }));
 assert.equal((await setup()({ kind: 'claim', ticket: 'ticket' })).data.function, '0xabc::router::withdraw_entry');
});
