import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import * as jsx from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
const component = (path, imports) => { const c = { exports: {}, require: (n) => { if (!(n in imports)) throw new Error(n); return imports[n]; } }; vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, c); return c.exports; };
const wrapper = (tag) => function Wrapper({ children }) { return React.createElement(tag, {}, children); };
const tabs = Object.fromEntries(['Tabs', 'TabsList', 'TabsContent', 'TabsTrigger'].map((name) => [name, wrapper('div')]));
function nodes(element, type) {
 if (!element || typeof element !== 'object') return [];
 if (Array.isArray(element)) return element.flatMap((item) => nodes(item, type));
 return [...(element.type === type ? [element] : []), ...nodes(element.props?.children, type)];
}
function route(chainId, selectedChain = chainId) {
 const PoolStakingView = wrapper('section'), LiquidStakingView = wrapper('article');
 const { StakingView } = component('src/components/staking/StakingView.tsx', { react: { useEffect() {} }, 'react/jsx-runtime': jsx, '@/stores/chainStore': { useChainStore: (select) => select({ selectedChainSlug: selectedChain, setSelectedChainSlug() {} }) }, '@/lib/chains/registry': { CHAIN_REGISTRY: { near: { name: 'NEAR' }, ethereum: { name: 'Ethereum' }, cardano: { name: 'Cardano' }, sui: { name: 'Sui' } } }, '@/components/ui/tabs': tabs, '@/features/liquid-staking/LiquidStakingView': { LiquidStakingView }, '@/features/liquid-staking/LiquidStakingAvailability': { LiquidStakingAvailability: wrapper('aside') }, '@/features/liquid-staking/availability': { hasLiquidStaking: (id) => ['near', 'ethereum', 'sui'].includes(id) }, './PoolStakingView': { PoolStakingView } });
 return { tree: StakingView({ chainId }), PoolStakingView, LiquidStakingView };
}
test('chains with both staking modes default to pool and preserve pending child state across mode changes', () => {
 const { tree, PoolStakingView, LiquidStakingView } = route('near');
 assert.equal(tree.props.defaultValue, 'pool'); assert.equal(nodes(tree, PoolStakingView).length, 1); assert.equal(nodes(tree, LiquidStakingView).length, 1);
 assert.ok(nodes(tree, tabs.TabsContent).every((node) => node.props.forceMount && node.props.className.includes('inactive')));
});
test('Ethereum only exposes supported liquid staking and explains native delegation', () => {
 const { tree, PoolStakingView } = route('ethereum'); assert.equal(tree.props.defaultValue, 'liquid'); assert.equal(nodes(tree, PoolStakingView).length, 0); assert.match(renderToStaticMarkup(tree), /does not support native delegation/);
});
test('chain changes cannot render a transaction UI using the previous chain store', () => {
 const { tree, PoolStakingView, LiquidStakingView } = route('near', 'sui'); assert.equal(nodes(tree, PoolStakingView).length + nodes(tree, LiquidStakingView).length, 0); assert.match(renderToStaticMarkup(tree), /Loading NEAR/);
 assert.notEqual(route('near').tree.key, route('sui').tree.key);
});
test('native-only and unknown chains have distinct safe routes', () => {
 const native = route('cardano'); assert.equal(nodes(native.tree, native.PoolStakingView).length, 1);
 assert.match(renderToStaticMarkup(route('missing').tree), /Unsupported staking chain/);
});
test('pool selection and user positions occupy separate tabs with disconnected and pending states', () => {
 const { PoolStakingTabs } = component('src/features/staking/PoolStakingTabs.tsx', { 'react/jsx-runtime': jsx, '@/components/ui/tabs': tabs });
 const tree = PoolStakingTabs({ selection: 'VALIDATORS', positions: 'POSITIONS', connected: false, pending: true });
 const contents = nodes(tree, tabs.TabsContent); assert.equal(contents[0].props.children, 'VALIDATORS'); assert.match(renderToStaticMarkup(contents[1]), /Connect your wallet/); assert.doesNotMatch(renderToStaticMarkup(contents[1]), /POSITIONS/);
 assert.ok(nodes(tree, tabs.TabsTrigger).every((node) => node.props.disabled));
});
test('liquid form clears amounts on unit changes and blocks duplicate pending submissions', () => {
 const state = []; let cursor = 0; const submissions = [];
 const Button = wrapper('button'), Input = wrapper('input');
 const { LiquidStakeForm } = component('src/features/liquid-staking/LiquidStakeForm.tsx', { react: { useState: (initial) => { const i = cursor++; state[i] ??= initial; return [state[i], (next) => state[i] = next]; } }, 'react/jsx-runtime': jsx, '@/components/ui/button': { Button }, '@/components/ui/input': { Input }, '@/components/ui/card': Object.fromEntries(['Card', 'CardHeader', 'CardContent', 'CardTitle'].map((n) => [n, wrapper('div')])) });
 const props = { stakeSymbol: 'SUI', unstakeSymbol: 'haSUI', ready: true, pending: false, onSubmit: (...args) => submissions.push(args) };
 const tree = () => { cursor = 0; return LiquidStakeForm(props); };
 nodes(tree(), Input)[0].props.onChange({ target: { value: '2' } }); nodes(tree(), Button).at(-1).props.onClick(); assert.deepEqual(submissions, [['stake', '2']]);
 nodes(tree(), Button)[1].props.onClick(); assert.equal(nodes(tree(), Input)[0].props.value, ''); assert.match(renderToStaticMarkup(tree()), /haSUI/);
 props.pending = true; nodes(tree(), Button).at(-1).props.onClick(); assert.equal(submissions.length, 1); assert.ok(nodes(tree(), Button).every((b) => b.props.disabled));
});

test('retired liquid providers remain unavailable while native staking stays supported', () => {
 const { hasLiquidStaking } = component('src/features/liquid-staking/availability.ts', {});
 for (const chain of ['sei','celestia','dydx','xpla','cardano','vechain']) assert.equal(hasLiquidStaking(chain), false);
 const { LiquidStakingAvailability } = component('src/features/liquid-staking/LiquidStakingAvailability.tsx', { 'react/jsx-runtime': jsx });
 assert.match(renderToStaticMarkup(LiquidStakingAvailability({ chainId: 'celestia' })), /closed new deposits/);
 assert.match(renderToStaticMarkup(LiquidStakingAvailability({ chainId: 'cardano' })), /keeps ADA spendable/);
});
