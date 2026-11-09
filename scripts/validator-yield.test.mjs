import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as jsxRuntime from 'react/jsx-runtime';
const source = fs.readFileSync('src/features/staking/validator-yield.ts', 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const context = { exports: {} };
vm.runInNewContext(compiled, context);
const { getValidatorYield, compareValidatorYields } = context.exports;

test('Sei validators have different estimated APR after commission', () => {
  assert.equal(getValidatorYield('sei', { commission: 0.1 }, 0.1), 0.1 * 0.9);
  assert.equal(getValidatorYield('sei', { commission: 0.2 }, 0.1), 0.1 * 0.8);
});
test('zero and full commission preserve valid zero yields', () => {
  assert.equal(getValidatorYield('sei', { commission: 0 }, 0.1), 0.1);
  assert.equal(getValidatorYield('sei', { commission: 1 }, 0.1), 0);
  assert.equal(getValidatorYield('sei', { commission: 0.1 }, 0), 0);
});
test('missing or failed network query does not invent a Sei yield', () => {
  assert.equal(getValidatorYield('sei', { commission: 0.1 }, null), null);
});
test('invalid rates and commissions are unavailable', () => {
  for (const rate of [NaN, Infinity, -1]) {
    assert.equal(getValidatorYield('sei', { commission: 0.1 }, rate), null);
    assert.equal(getValidatorYield('kaia', { apy: rate }, null), null);
  }
  for (const commission of [NaN, Infinity, -0.1, 1.1]) {
    assert.equal(getValidatorYield('sei', { commission }, 0.1), null);
  }
});
test('Kaia uses the supplied validator APY without deducting commission again', () => {
  assert.equal(getValidatorYield('kaia', { apy: 0.0509, commission: 0.1 }, 0.2), 0.0509);
  assert.equal(getValidatorYield('kaia', { apy: 0 }, null), 0);
  assert.equal(getValidatorYield('kaia', {}, null), null);
});
test('missing yields sort last in both directions and equal rates compare equally', () => {
  for (const direction of ['asc', 'desc']) {
    assert.equal(compareValidatorYields(null, 0, direction), 1);
    assert.equal(compareValidatorYields(0, null, direction), -1);
    assert.equal(compareValidatorYields(null, null, direction), 0);
    assert.equal(compareValidatorYields(0.1, 0.1, direction), 0);
  }
  assert.ok(compareValidatorYields(0.1, 0.2, 'asc') < 0);
  assert.ok(compareValidatorYields(0.1, 0.2, 'desc') > 0);
});

function renderValidatorTable(slug, validators, networkRate) {
  const componentSource = fs.readFileSync('src/components/staking/ValidatorTable.tsx', 'utf8');
  const componentCode = ts.transpileModule(componentSource, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const wrapper = ({ children }) => React.createElement('div', null, children);
  const imports = {
    react: React,
    'react/jsx-runtime': jsxRuntime,
    '@/hooks/useChain': { useChain: () => ({ config: { slug, stakingToken: { decimals: 6, symbol: 'TOKEN' } } }) },
    '@/hooks/useStaking': {
      useValidators: () => ({ data: validators, isLoading: false }),
      useDelegations: () => ({ data: [] }),
    },
    '@/hooks/useStakingApy': { useStakingApy: () => ({ apy: networkRate }) },
    '@/features/staking/validator-yield': context.exports,
    '@/lib/utils/format': {
      formatPercentage: value => `${(value * 100).toFixed(2)}%`,
      formatTokenAmount: value => value,
    },
    './StakeDialog': { StakeDialog: () => null },
    'next/image': () => null,
  };
  const componentContext = {
    exports: {},
    require: name => {
      if (imports[name]) return imports[name];
      if (name.startsWith('@/components/ui/') || name === 'lucide-react') {
        return new Proxy({}, { get: () => wrapper });
      }
      throw new Error(`Unexpected import: ${name}`);
    },
  };
  vm.runInNewContext(componentCode, componentContext);
  return renderToStaticMarkup(React.createElement(componentContext.exports.ValidatorTable));
}

const baseValidator = { address: 'validator1', name: 'Validator One', commission: 0.1, votingPower: '1000000', status: 'active', logo: null };
test('Sei table renders estimated APR per validator', () => {
  const html = renderValidatorTable('sei', [baseValidator, { ...baseValidator, address: 'validator2', commission: 0.2 }], 0.1);
  assert.match(html, /APR/);
  assert.match(html, /9\.00%/);
  assert.match(html, /8\.00%/);
});
test('Kaia table renders supplied APY and preserves column when rates are unavailable', () => {
  assert.match(renderValidatorTable('kaia', [{ ...baseValidator, apy: 0.0509 }], null), /5\.09%/);
  const html = renderValidatorTable('kaia', [baseValidator], null);
  assert.match(html, /APY/);
  assert.doesNotMatch(html, /NaN|undefined%/);
  assert.match(html, />-</);
});
test('Sei failed rate fetch and empty lists still render a usable table', () => {
  const html = renderValidatorTable('sei', [baseValidator], null);
  assert.match(html, /Validator One/);
  assert.match(html, />-</);
  assert.match(renderValidatorTable('sei', [], null), /No validators found/);
});
