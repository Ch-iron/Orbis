import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as ton from '@ton/core';
const owner = '0:' + '1'.repeat(64), pool = '0:' + '2'.repeat(64), jettonWallet = '0:' + '3'.repeat(64);
function prepare(overrides = {}) {
 const c = { exports: {}, require: (n) => ({ '@ton/core': ton, '@/lib/chains/ton/client': { tonAddress: (a) => ton.Address.parse(a).toRawString() }, './client': { TONSTAKERS_POOL: pool, readTonstakersPosition: async () => ({ minimumStake: ton.toNano('1'), available: ton.toNano('10'), receipt: ton.toNano('5'), jettonWallet, ...overrides }) } })[n] };
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/features/ton-liquid-staking/actions.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { ...c, Date });
 return (kind, amount) => c.exports.prepareTonstakersAction(owner, { kind, amount });
}
test('Tonstakers stake sends principal and execution reserve to the pool', async () => {
 const tx = await prepare()('stake', '2'); assert.equal(tx.messages[0].amount, ton.toNano('3').toString()); assert.equal(ton.Address.parse(tx.messages[0].address).toRawString(), pool);
 const body = ton.Cell.fromBase64(tx.messages[0].payload).beginParse(); assert.equal(body.loadUint(32), 0x47d54391);
});
test('Tonstakers withdrawal burns exact tsTON from the user jetton wallet', async () => {
 const tx = await prepare()('unstake', '2'); assert.equal(ton.Address.parse(tx.messages[0].address).toRawString(), jettonWallet);
 const body = ton.Cell.fromBase64(tx.messages[0].payload).beginParse(); assert.equal(body.loadUint(32), 0x595f07bc); body.loadUintBig(64); assert.equal(body.loadCoins(), ton.toNano('2')); assert.equal(body.loadAddress().toRawString(), owner);
});
test('Tonstakers rejects invalid amounts, receipt overspend and insufficient gas', async () => {
 for (const amount of ['', '0', '-1', '1e2', '0.0000000001', '10']) await assert.rejects(prepare()('stake', amount));
 await assert.rejects(prepare()('unstake', '6'));
 await assert.rejects(prepare({ available: ton.toNano('1') })('unstake', '1'));
});

test('Tonstakers rejects deposits below the live pool minimum', async () => {
 await assert.rejects(prepare()('stake', '0.5'), /minimum/i);
});
