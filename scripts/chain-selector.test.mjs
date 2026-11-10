import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';

function setup(pathname = '/stake/xpla', walletType = null, mobile = false) {
  const events = [];
  const Select = () => null;
  const SelectTrigger = () => null;
  const imports = {
    'react/jsx-runtime': jsx,
    'next/image': () => null,
    'next/navigation': { usePathname: () => pathname, useRouter: () => ({ push: (path) => events.push(['push', path]) }) },
    '@/components/ui/select': { Select, SelectTrigger, SelectContent: () => null, SelectItem: () => null, SelectValue: () => null },
    '@/stores/chainStore': { useChainStore: (select) => select({ selectedChainSlug: 'xpla', setSelectedChainSlug: (slug) => events.push(['select', slug]) }) },
    '@/lib/chains/registry': { CHAIN_REGISTRY: { xpla: { name: 'XPLA', cosmosKitChainName: 'xpla' }, sei: { name: 'Sei', cosmosKitChainName: 'sei' }, kaia: { name: 'Kaia' } }, SORTED_CHAIN_CONFIGS: [] },
    '@/hooks/useTokenPrice': { useTokenPrice: () => ({}) },
    '@/hooks/useWalletInfo': { useWalletInfo: () => ({ walletType, disconnect: () => events.push(['disconnect']) }) },
  };
  const context = { exports: {}, require: (name) => { if (!(name in imports)) throw new Error(name); return imports[name]; } };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/common/ChainSelector.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, context);
  const tree = context.exports.SidebarChainSelector({ onChainChange: mobile ? () => events.push(['navigate']) : undefined });
  return { events, change: tree.props.onValueChange, trigger: tree.props.children[0] };
}

test('stake selection updates both the selected chain and the route', () => {
  const view = setup(); view.change('sei');
  assert.deepEqual(view.events, [['select', 'sei'], ['push', '/stake/sei']]);
});
test('other dashboard tabs keep their route when changing chains', () => {
  for (const path of ['/overview', '/portfolio', '/history']) {
    const view = setup(path); view.change('kaia'); assert.deepEqual(view.events, [['select', 'kaia']]);
  }
});
test('selecting the same stake route does not add a history entry', () => {
  const view = setup(); view.change('xpla'); assert.deepEqual(view.events, [['select', 'xpla']]);
});
test('unknown and empty chains cannot update selection or navigation', () => {
  const view = setup(); view.change(''); view.change('missing'); assert.deepEqual(view.events, []);
});
test('incompatible wallets disconnect before switching chains', () => {
  const cosmos = setup('/stake/xpla', 'cosmos'); cosmos.change('kaia'); assert.equal(cosmos.events[0][0], 'disconnect');
  const klip = setup('/stake/kaia', 'klip'); klip.change('sei'); assert.equal(klip.events[0][0], 'disconnect');
  const compatible = setup('/stake/xpla', 'cosmos'); compatible.change('sei'); assert.ok(compatible.events.every(([kind]) => kind !== 'disconnect'));
});
test('selected chain names preserve the registry capitalization', () => {
  assert.doesNotMatch(setup().trigger.props.className, /\buppercase\b/);
});

test('mobile chain selection closes navigation after applying the chain change', () => {
  const view = setup('/stake/xpla', null, true);
  view.change('sei');
  assert.deepEqual(view.events, [['select', 'sei'], ['push', '/stake/sei'], ['navigate']]);
});
