import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as viem from 'viem';
const load = (path, imports) => { const c = { exports: {}, require: (n) => imports[n] }; vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, c); return c.exports; };
const unit = 10n ** 18n, owner = '0x0000000000000000000000000000000000000001';
function setup(overrides = {}) {
 const contracts = load('src/features/iotex-liquid-staking/contracts.ts', { viem });
 const position = { available: 10n * unit, receipt: 2000n * unit, supply: 10000n * unit, reserve: 12000n * unit, redeemBase: 1000n * unit, allowance: 0n, claimable: unit, debt: unit, paused: false, clearPaused: false, tokenPaused: false, clear: owner, timestamp: 1000n, ...overrides };
 const prepare = load('src/features/iotex-liquid-staking/actions.ts', { viem, './contracts': contracts, './client': { readBedrockPosition: async () => position }, '@/features/ethereum-staking/amount': load('src/features/ethereum-staking/amount.ts', { viem }) }).prepareBedrockAction;
 return { run: (action) => prepare(owner, action), contracts };
}
test('Bedrock stakes native IOTX with a chain-based deadline', async () => {
 const s = setup(); const [tx] = await s.run({ kind: 'stake', amount: '1' }); assert.equal(tx.value, unit); assert.equal(viem.decodeFunctionData({ abi: s.contracts.BEDROCK_ABI, data: tx.data }).functionName, 'deposit');
});
test('Bedrock redemption uses IOTX value in exact protocol increments and approves only needed uniIOTX', async () => {
 const s = setup(); await assert.rejects(s.run({ kind: 'unstake', amount: '1' }));
 const tx = await s.run({ kind: 'unstake', amount: '1000' }); assert.equal(tx.length, 2);
 const approval = viem.decodeFunctionData({ abi: viem.erc20Abi, data: tx[0].data }); assert.equal(approval.args[1], 1000n * unit * 10000n / 12000n);
 assert.equal(viem.decodeFunctionData({ abi: s.contracts.BEDROCK_ABI, data: tx[1].data }).args[0], 1000n * unit);
});
test('Bedrock rejects paused operations, invalid amounts, excess balance and unclaimable debt', async () => {
 for (const amount of ['', '0', '-1', '10']) await assert.rejects(setup().run({ kind: 'stake', amount }));
 await assert.rejects(setup({ paused: true }).run({ kind: 'stake', amount: '1' }));
 await assert.rejects(setup({ claimable: 0n }).run({ kind: 'claim' }));
 const s = setup(); const [tx] = await s.run({ kind: 'claim' }); assert.equal(viem.decodeFunctionData({ abi: s.contracts.CLEAR_ABI, data: tx.data }).functionName, 'claim');
});
