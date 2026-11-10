import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(path) {
  const context = { exports: {}, BigInt, require: (name) => { throw new Error(`unexpected import ${name}`); } };
  const source = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(source, context);
  return context.exports;
}

const { toAllocationSlices } = load('src/features/staking/allocation.ts');
const position = (name, amount) => ({ validatorAddress: `addr-${name}`, validatorName: name, amount, rewards: '0' });
// Copy into this realm so deepEqual does not trip on the vm realm prototype
const pick = (slices, key) => Array.from(slices, (slice) => slice[key]);

test('no positions or only zero amounts produce no slices', () => {
  assert.equal(toAllocationSlices([]).length, 0);
  assert.equal(toAllocationSlices([position('a', '0')]).length, 0);
});

test('a single position fills the whole ring with the first color', () => {
  const [slice] = toAllocationSlices([position('a', '5')]);
  assert.equal(slice.basisPoints, 10000);
  assert.equal(slice.colorVar, '--allocation-1');
});

test('up to three positions are named and ordered by amount', () => {
  const slices = toAllocationSlices([position('small', '1'), position('large', '6'), position('mid', '3')]);
  assert.deepEqual(pick(slices, 'label'), ['large', 'mid', 'small']);
  assert.deepEqual(pick(slices, 'basisPoints'), [6000, 3000, 1000]);
  assert.deepEqual(pick(slices, 'colorVar'), ['--allocation-1', '--allocation-2', '--allocation-3']);
});

test('positions beyond the third fold into one Other slice', () => {
  const slices = toAllocationSlices([position('a', '40'), position('b', '30'), position('c', '20'), position('d', '6'), position('e', '4')]);
  assert.deepEqual(pick(slices, 'label'), ['a', 'b', 'c', 'Other (2 positions)']);
  assert.equal(slices[3].amount, '10');
  assert.equal(slices[3].colorVar, '--allocation-other');
  assert.equal(slices.reduce((sum, slice) => sum + slice.basisPoints, 0), 10000);
});

test('a single folded position still reads as Other', () => {
  const slices = toAllocationSlices([position('a', '4'), position('b', '3'), position('c', '2'), position('d', '1')]);
  assert.equal(slices[3].label, 'Other (1 position)');
});

test('an unnamed position falls back to its address', () => {
  const [slice] = toAllocationSlices([{ validatorAddress: 'addr-x', validatorName: '', amount: '1', rewards: '0' }]);
  assert.equal(slice.label, 'addr-x');
});

test('18-decimal amounts keep exact shares', () => {
  const slices = toAllocationSlices([position('a', '3000000000000000000000001'), position('b', '1000000000000000000000000')]);
  // 1e24 / (4e24 + 1) is just under 25%; floating point would drop the +1 and report 2500
  assert.deepEqual(pick(slices, 'basisPoints'), [7500, 2499]);
  assert.equal(slices[0].amount, '3000000000000000000000001');
});

test('a share below 0.01% rounds down to zero basis points', () => {
  const slices = toAllocationSlices([position('a', '1000000'), position('b', '1')]);
  assert.equal(slices[1].basisPoints, 0);
});
