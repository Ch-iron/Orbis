import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as viem from 'viem';
const load = (path, imports) => { const c = { exports: {}, require: (n) => imports[n] }; vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, c); return c.exports; };
const owner = '0x0000000000000000000000000000000000000001';
function setup(overrides = {}) {
  const contracts = load('src/features/sonic-liquid-staking/contracts.ts', { viem });
  const position = { available: 5n * 10n ** 18n, receipt: 3n * 10n ** 18n, poolShares: 2n * 10n ** 18n, minimumDeposit: 10000000000000000n, minimumUnstake: 1000000000000n, depositPaused: false, poolPaused: false, undelegatePaused: false, withdrawPaused: false, withdrawals: [{ id: 1n, ready: true }], ...overrides };
  const prepare = load('src/features/sonic-liquid-staking/actions.ts', { viem, './contracts': contracts, './client': { readBeetsPosition: async () => position, readBeetsCapacity: async () => [{ id: 2n, shares: 2n * 10n ** 18n }, { id: 3n, shares: 2n * 10n ** 18n }] }, '@/features/ethereum-staking/amount': load('src/features/ethereum-staking/amount.ts', { viem }) }).prepareBeetsAction;
  return { run: (action) => prepare(owner, action), decode: (tx) => viem.decodeFunctionData({ abi: contracts.STS_ABI, data: tx[0].data }) };
}
test('Beets deposits exact native S and rejects paused, zero, and excess balances', async () => {
  const s = setup(); const tx = await s.run({ kind: 'stake', amount: '1' }); assert.equal(s.decode(tx).functionName, 'deposit'); assert.equal(tx[0].value, 10n ** 18n);
  for (const amount of ['', '0', '-1', '5']) await assert.rejects(s.run({ kind: 'stake', amount }));
  await assert.rejects(setup({ depositPaused: true }).run({ kind: 'stake', amount: '1' }));
});
test('Beets uses pool liquidity when sufficient and validator split otherwise', async () => {
  const s = setup(); assert.equal(s.decode(await s.run({ kind: 'unstake', amount: '1' })).functionName, 'undelegateFromPool');
  const decoded = s.decode(await s.run({ kind: 'unstake', amount: '3' })); assert.equal(decoded.functionName, 'undelegateMany'); assert.deepEqual(decoded.args, [[2n, 3n], [2n * 10n ** 18n, 10n ** 18n]]);
  await assert.rejects(s.run({ kind: 'unstake', amount: '4' }));
});
test('Beets never enables emergency withdrawal or claims unready or unknown requests', async () => {
  const s = setup(); assert.deepEqual(s.decode(await s.run({ kind: 'claim', requestId: 1n })).args, [1n, false]);
  await assert.rejects(s.run({ kind: 'claim', requestId: 2n }));
  await assert.rejects(setup({ withdrawals: [{ id: 1n, ready: false }] }).run({ kind: 'claim', requestId: 1n }));
});
