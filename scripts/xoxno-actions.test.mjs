import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as sdk from '@multiversx/sdk-core';
import * as viem from 'viem';
const owner = 'erd1q3r6dphmmaly7wg5h0lh2dp7tvc2us46xt606qjr2glwyuggr4tquvex2h';
const pool = 'erd1qqqqqqqqqqqqqpgq6uzdzy54wnesfnlaycxwymrn9texlnmyah0ssrfvk6';
const unit = 10n ** 18n;
function setup(overrides = {}, failed = false) {
 const position = { active: true, receipt: 2n * unit, token: 'XEGLD-abcdef', withdrawalToken: 'UEGLD-abcdef', tickets: [{ id: 'ticket', nonce: 3n, amount: unit, ready: true }], ...overrides };
 const imports = {
  './client': { XOXNO_POOL: pool, readXoxnoPosition: async () => position },
  '@/features/ethereum-staking/amount': { parseStakeAmount: (s) => { if (!/^\d+(\.\d{1,18})?$/.test(s) || viem.parseUnits(s,18) <= 0n) throw new Error('Invalid amount'); return viem.parseUnits(s,18); } },
  '@/features/multiversx-staking/simulation': { assertMultiversxSimulation: (r) => { if (r.failed) throw new Error('simulation failed'); } },
  '@/lib/chains/multiversx/client': { multiversxClient: { getAccount: async () => ({ nonce: 4n, balance: 10n * unit }), simulateTransaction: async (tx, check) => { assert.equal(check, false); assert.equal(tx.signature.length, 64); return { raw: { failed } }; } } },
 };
 const c = { exports: {}, require: (n) => n.startsWith('@multiversx/sdk-core/') ? sdk : imports[n] };
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/features/multiversx-liquid-staking/actions.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,c);
 return (action) => c.exports.prepareXoxnoAction(owner,action);
}
test('XOXNO native deposits use the mainnet pool and unsigned simulated transaction', async () => {
 const tx = await setup()({ kind: 'stake', amount: '1' }); assert.equal(tx.value,unit); assert.equal(tx.chainID,'1'); assert.equal(tx.nonce,4n); assert.equal(tx.signature.length,0); assert.equal(new TextDecoder().decode(tx.data),'delegate'); assert.equal(tx.receiver.toBech32(),pool);
});
test('XOXNO redemptions transfer xEGLD and claims transfer the owned unbonding token', async () => {
 const unstake = await setup()({ kind: 'unstake', amount: '1' }); assert.match(new TextDecoder().decode(unstake.data), /^ESDTTransfer@/); assert.ok(new TextDecoder().decode(unstake.data).endsWith(Buffer.from('unDelegate').toString('hex')));
 const claim = await setup()({ kind: 'claim', ticketId: 'ticket' }); assert.match(new TextDecoder().decode(claim.data), /^ESDTNFTTransfer@/); assert.ok(new TextDecoder().decode(claim.data).endsWith(Buffer.from('withdraw').toString('hex')));
});
test('XOXNO rejects invalid amounts, insufficient receipt or gas balance and simulation failures', async () => {
 for (const amount of ['', '0', '-1', '10']) await assert.rejects(setup()({ kind: 'stake', amount }));
 await assert.rejects(setup()({ kind: 'unstake', amount: '3' }));
 await assert.rejects(setup({},true)({ kind: 'stake', amount: '1' }));
});
test('XOXNO rejects paused staking, missing and locked withdrawal tickets', async () => {
 await assert.rejects(setup({ active:false })({ kind:'stake',amount:'1' }));
 await assert.rejects(setup()({ kind:'claim',ticketId:'missing' }));
 await assert.rejects(setup({ tickets:[{id:'ticket',ready:false}] })({ kind:'claim',ticketId:'ticket' }));
});
