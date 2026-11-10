import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
import React from 'react';
import * as jsx from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';

function setup(overrides = {}) {
  const state = [];
  let cursor = 0;
  const selected = [];
  const props = {
    targets: [{ id: 'pool-a', name: 'Alpha', details: 'Commission 0%' }, { id: 'pool-b', name: 'Beta', details: 'Minimum 25 AVAX' }],
    value: '', onSelect: (id) => selected.push(id), loading: false, error: null, pending: false, ...overrides,
  };
  const wrapper = (tag) => function Wrapper({ children, ...props }) { return React.createElement(tag, props, children); };
  const imports = {
    react: { useState: (initial) => { const index = cursor++; state[index] ??= initial; return [state[index], (value) => { state[index] = value; }]; } },
    'react/jsx-runtime': jsx,
    '@/components/ui/button': { Button: ({ variant, size, ...props }) => React.createElement('button', { ...props, 'data-variant': variant, 'data-size': size }) },
    '@/components/ui/input': { Input: wrapper('input') },
    '@/components/ui/table': Object.fromEntries(Object.entries({ Table: 'table', TableHeader: 'thead', TableBody: 'tbody', TableRow: 'tr', TableHead: 'th', TableCell: 'td' }).map(([key, tag]) => [key, wrapper(tag)])),
  };
  const context = { exports: {}, require: (name) => { if (!imports[name]) throw new Error(name); return imports[name]; } };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/features/staking/StakingTargetTable.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, context);
  const tree = () => { cursor = 0; return context.exports.StakingTargetTable(props); };
  const nodes = (element, type) => {
    if (!element || typeof element !== 'object') return [];
    if (Array.isArray(element)) return element.flatMap((item) => nodes(item, type));
    return [...(element.type === type ? [element] : []), ...nodes(element.props?.children, type)];
  };
  return { html: () => renderToStaticMarkup(tree()), input: () => nodes(tree(), imports['@/components/ui/input'].Input)[0], buttons: () => nodes(tree(), imports['@/components/ui/button'].Button), selected };
}

test('empty target list has an explicit empty state', () => assert.match(setup({ targets: [] }).html(), /No validators or pools found/));
test('loading is distinct from an empty response', () => {
  const html = setup({ loading: true }).html();
  assert.match(html, /Loading validators and pools/); assert.doesNotMatch(html, /No validators or pools found/);
});
test('failed reads do not expose stale targets for selection', () => {
  const html = setup({ error: new Error('RPC unavailable') }).html();
  assert.match(html, /RPC unavailable/); assert.doesNotMatch(html, /Alpha/);
});
test('search matches name and address and shows an empty search result', () => {
  const view = setup();
  view.input().props.onChange({ target: { value: 'POOL-B' } });
  assert.match(view.html(), /Beta/); assert.doesNotMatch(view.html(), /Alpha/);
  view.input().props.onChange({ target: { value: 'missing' } });
  assert.match(view.html(), /No validators or pools found/);
});
test('selection returns the actual target identifier and displays zero commission', () => {
  const view = setup(); view.buttons()[0].props.onClick();
  assert.deepEqual(view.selected, ['pool-a']); assert.match(view.html(), /Commission 0%/);
});
test('pending transactions disable target changes', () => {
  const view = setup({ pending: true });
  assert.ok(view.buttons().every((button) => button.props.disabled));
  view.buttons()[0].props.onClick(); assert.deepEqual(view.selected, []);
});
test('a selected target is identified without hiding other choices', () => {
  const html = setup({ value: 'pool-b' }).html();
  assert.match(html, /Selected/); assert.match(html, /Alpha/); assert.match(html, /Beta/);
});
