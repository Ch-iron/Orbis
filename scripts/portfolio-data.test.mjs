import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
import React from 'react';
import * as jsx from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import { formatUnits } from 'viem';

function render(component, overrides = {}, config = {}) {
  const query = (data) => ({ data, isLoading: false, error: null });
  const queries = { useDelegations: query([]), useBalance: query('0'), useRewards: query({ total: '0', perValidator: [] }), useUnbonding: query([]), ...overrides };
  const wrapper = ({ children }) => React.createElement('div', null, children);
  const imports = {
    'react/jsx-runtime': jsx,
    '@/hooks/useStaking': Object.fromEntries(Object.entries(queries).map(([key, result]) => [key, () => result])),
    '@/hooks/useChain': { useChain: () => ({ config: { slug: 'sei', stakingToken: { denom: 'usei', symbol: 'SEI', decimals: 6 }, ...config } }) },
    '@/hooks/useStakingApy': { useStakingApy: () => ({ apy: null, isLoading: false }) },
    '@/stores/chainStore': { useChainStore: (select) => select({ selectedChainSlug: config.slug ?? 'sei' }) },
    '@/lib/utils/format': {
      formatTokenAmount: (value, decimals) => formatUnits(BigInt(value), decimals),
      formatRewardDisplay: (value, decimals, unit) => ({ value: formatUnits(BigInt(value), decimals), unit }),
    },
    'next/link': ({ href, children }) => React.createElement('a', { href }, children),
  };
  const context = { exports: {}, require: (name) => imports[name] ?? new Proxy({}, { get: () => wrapper }) };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(`src/components/portfolio/${component}.tsx`, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, context);
  return renderToStaticMarkup(React.createElement(context.exports[component]));
}
test('failed balance, positions, rewards and unbonding reads are unavailable, not zero', () => {
  const failed = { error: new Error('RPC unavailable'), isLoading: false };
  const html = render('PortfolioSummaryCards', { useDelegations: failed, useBalance: failed, useRewards: failed, useUnbonding: failed });
  assert.match(html, /RPC unavailable/);
  assert.doesNotMatch(html, />0(?: |<)/);
  assert.equal((html.match(/Unavailable/g) ?? []).length, 4);
});
test('successful zero balances are displayed as zero', () => {
  const html = render('PortfolioSummaryCards');
  assert.match(html, />0(?: |<)/);
  assert.doesNotMatch(html, /Unavailable/);
});
for (const [slug, symbol, decimals] of [['vechain', 'VTHO', 18], ['dydx', 'USDC', 6]]) {
  test(`${slug}: rewards retain their own token and decimals`, () => {
    const token = { denom: symbol.toLowerCase(), symbol, decimals };
    const html = render('PortfolioSummaryCards', { useRewards: { data: { total: '0', tokens: [{ ...token, amount: String(2n * 10n ** BigInt(decimals)) }] } } }, { slug, rewardTokens: [token] });
    assert.match(html, new RegExp(symbol));
    assert.match(html, />2(?: |<)/);
  });
}
test('failed delegations are not presented as an empty account', () => {
  const html = render('DelegationList', { useDelegations: { error: new Error('Positions unavailable') } });
  assert.match(html, /role="alert"/);
  assert.match(html, /Positions unavailable/);
  assert.doesNotMatch(html, /No active delegations/);
});
test('empty account offers staking for the selected chain', () => {
  const html = render('DelegationList', {}, { slug: 'near' });
  assert.match(html, /No active delegations/);
  assert.match(html, /href="\/stake\/near"/);
});
test('multiple positions with the same validator remain visible', () => {
  const html = render('DelegationList', { useDelegations: { data: [
    { validatorAddress: 'validator', validatorName: 'Position A', amount: '1000000', rewards: '0' },
    { validatorAddress: 'validator', validatorName: 'Position B', amount: '2000000', rewards: '0' },
  ] } });
  assert.match(html, /Position A/);
  assert.match(html, /Position B/);
});
