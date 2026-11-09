import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = fs.readFileSync('src/lib/chains/sei/apr.ts', 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const endpoints = ['/seichain/mint/v1beta1/minter', '/cosmos/staking/v1beta1/pool', '/cosmos/distribution/v1beta1/params'];
const fixture = () => [
  { start_date: '2026-01-01', end_date: '2027-01-01', total_mint_amount: '1000' },
  { pool: { bonded_tokens: '10000' } },
  { params: { community_tax: '0.02' } },
];
async function fetchRate(data, failIndex = -1, failure = 'http') {
  const calls = [];
  const context = { exports: {}, fetch: async url => {
    const index = endpoints.indexOf(url.replace('https://lcd.example', ''));
    calls.push(index);
    assert.notEqual(index, -1, 'uses the same endpoints as the official dashboard');
    if (index === failIndex && failure === 'network') throw new Error('network failure');
    return { ok: index !== failIndex || failure !== 'http', json: async () => {
      if (index === failIndex && failure === 'json') throw new Error('invalid JSON');
      return data[index];
    } };
  } };
  vm.runInNewContext(code, context);
  const rate = await context.exports.fetchSeiApr({ lcd: 'https://lcd.example' });
  assert.deepEqual(calls.sort(), [0, 1, 2]);
  return rate;
}
test('matches dashboard annualization and community tax', async () => {
  assert.equal(await fetchRate(fixture()), 0.098);
});
test('matches dashboard exclusive day count across the current mint period', async () => {
  const data = fixture();
  data[0] = { start_date: '2026-08-15', end_date: '2027-08-14', total_mint_amount: '165000000000000' };
  data[1].pool.bonded_tokens = '4078776736030529';
  data[2].params.community_tax = '0';
  assert.equal(await fetchRate(data), 165000000000000 / 364 * 365 / 4078776736030529);
});
test('zero bonded tokens, zero issuance and full community tax produce zero', async () => {
  for (const mutate of [d => { d[1].pool.bonded_tokens = '0'; }, d => { d[0].total_mint_amount = '0'; }, d => { d[2].params.community_tax = '1'; }]) {
    const data = fixture(); mutate(data); assert.equal(await fetchRate(data), 0);
  }
});
test('rejects malformed data instead of displaying invented rates', async () => {
  for (const mutate of [
    d => { d[0] = null; },
    d => { d[0].end_date = d[0].start_date; },
    d => { d[0].end_date = 'invalid'; },
    d => { d[0].total_mint_amount = ''; },
    d => { d[1].pool.bonded_tokens = '-1'; },
    d => { d[2].params.community_tax = '1.1'; },
    d => { d[2] = {}; },
  ]) {
    const data = fixture(); mutate(data); await assert.rejects(fetchRate(data));
  }
});
test('propagates HTTP, network and JSON failures from each endpoint', async () => {
  for (const failure of ['http', 'network', 'json']) {
    for (let index = 0; index < 3; index++) await assert.rejects(fetchRate(fixture(), index, failure));
  }
});
test('repeated concurrent reads calculate independently', async () => {
  assert.deepEqual(await Promise.all([fetchRate(fixture()), fetchRate(fixture())]), [0.098, 0.098]);
});
