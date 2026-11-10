import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
import React from 'react';
import * as jsx from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';

const slugs = ['sei', 'xpla', 'kaia', 'ethereum', 'avalanche', 'algorand', 'near', 'celestia', 'cardano', 'polygon', 'iotex', 'vechain', 'aptos', 'multiversx', 'sonic', 'iota', 'sui', 'ton', 'dydx'];
function render(slug, isConnected) {
  const imports = {
    'react/jsx-runtime': jsx,
    '@/hooks/useWalletInfo': { useWalletInfo: () => ({ isConnected }) },
    '@/stores/chainStore': { useChainStore: (select) => select({ selectedChainSlug: slug }) },
    '@/lib/chains/registry': { CHAIN_REGISTRY: Object.fromEntries(slugs.map((slug) => [slug, { slug }])) },
    'next/image': () => null,
  };
  const context = { exports: {}, require: (name) => {
    if (imports[name]) return imports[name];
    const component = name.split('/').at(-1);
    return { [component]: () => React.createElement('div', null, component) };
  } };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/portfolio/PortfolioView.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, context);
  return renderToStaticMarkup(React.createElement(context.exports.PortfolioView));
}
for (const slug of slugs) {
  test(`${slug}: connected portfolio renders balances, charts and delegations, not a staking form`, () => {
    const html = render(slug, true);
    assert.match(html, /<h1[^>]*>Portfolio<\/h1>/);
    assert.match(html, /PortfolioSummaryCards/);
    assert.match(html, /TokenPriceChart/);
    assert.match(html, /DelegationList/);
    assert.doesNotMatch(html, /StakingView/);
  });
  test(`${slug}: disconnected portfolio asks for a wallet without mounting account queries`, () => {
    const html = render(slug, false);
    assert.match(html, /Connect Your Wallet/);
    assert.doesNotMatch(html, /PortfolioSummaryCards|StakingView/);
  });
}
