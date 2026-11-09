import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
import * as xpla from '@xpla/xpla.js';
function load(path, imports) {
  const context = { exports: {}, require: (name) => imports[name] };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText, context);
  return context.exports;
}
test('XPLA posting preserves supported SDK messages and rejects foreign or empty messages', () => {
  const { toXplaMessages } = load('src/features/xpla-staking/messages.ts', { '@xpla/xpla.js': xpla });
  const messages = [new xpla.MsgDelegate('xpla1owner', 'xplavaloper1validator', new xpla.Coin('axpla', '1')), new xpla.MsgWithdrawDelegatorReward('xpla1owner', 'xplavaloper1validator')];
  assert.equal(toXplaMessages(messages)[0], messages[0]);
  for (const invalid of [[], [null], [{}], [{ typeUrl: '/cosmos.staking.v1beta1.MsgDelegate', value: {} }]]) assert.throws(() => toXplaMessages(invalid));
});
test('theme toggle keeps server placeholder and toggles browser theme without effect state', () => {
  const render = (server, theme) => {
    let changed;
    const jsx = (type, props) => ({ type, props });
    const { ThemeToggle } = load('src/components/layout/ThemeToggle.tsx', {
      react: { useSyncExternalStore: (_, snapshot, serverSnapshot) => server ? serverSnapshot() : snapshot() },
      'react/jsx-runtime': { jsx, jsxs: jsx }, 'next-themes': { useTheme: () => ({ theme, setTheme: (value) => { changed = value; } }) },
      'lucide-react': { Sun: 'Sun', Moon: 'Moon' }, '@/components/ui/button': { Button: 'Button' },
    });
    return { button: ThemeToggle(), changed: () => changed };
  };
  assert.equal(render(true, undefined).button.props.disabled, true);
  for (const theme of ['dark', 'light']) { const rendered = render(false, theme); rendered.button.props.onClick(); assert.equal(rendered.changed(), theme === 'dark' ? 'light' : 'dark'); }
});
test('Kaia and Sei keep rejecting Cosmos message builders after deduplication', () => {
  const kaia = load('src/lib/chains/kaia/adapter.ts', {}).createKaiaAdapter({});
  const sei = load('src/lib/chains/sei/adapter.ts', { '../cosmos-utils': {}, './precompile': { SEI_STAKING_PRECOMPILE_ADDRESS: '0x1', SEI_DISTRIBUTION_PRECOMPILE_ADDRESS: '0x2' } }).createSeiAdapter({ stakingToken: { denom: 'usei' } }, {}, '');
  for (const adapter of [kaia, sei]) {
    for (const method of ['buildDelegateMsg', 'buildUndelegateMsg', 'buildRedelegateMsg', 'buildWithdrawRewardsMsg', 'buildSendMsg', 'buildCompoundMsg', 'buildSplitRewardsMsg']) {
      assert.throws(() => adapter[method]({}), /Use EVM wallet/);
    }
  }
});
