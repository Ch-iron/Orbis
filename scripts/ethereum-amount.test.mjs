import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
import * as viem from 'viem';
const context = { exports: {}, require: () => viem };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/features/ethereum-staking/amount.ts','utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, context);
const { parseStakeAmount } = context.exports;
test('exact decimal amounts keep all 18 digits', () => {
  assert.equal(parseStakeAmount('1.000000000000000001'), 1000000000000000001n);
  assert.equal(parseStakeAmount('0.000000000000000001'), 1n);
});
test('zero, empty, negatives, exponent notation, excessive precision and malformed amounts fail', () => {
  for (const value of ['', ' ', '0', '0.0', '-1', '1e3', 'NaN', '1,000', '1.0000000000000000001']) assert.throws(() => parseStakeAmount(value));
});
