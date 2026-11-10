import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';

function setup(pending) {
  const changes = [];
  const imports = {
    'react/jsx-runtime': jsx,
    '@/components/ui/dialog': Object.fromEntries(['Dialog', 'DialogContent', 'DialogHeader', 'DialogTitle', 'DialogDescription', 'DialogFooter'].map(name => [name, name])),
    '@/components/layout/WalletButton': { WalletButton: 'WalletButton' },
    '@/components/ui/button': { Button: 'Button' },
  };
  const context = { exports: {}, require: name => imports[name] };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/features/staking/PoolStakeDialog.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, context);
  return { changes, tree: context.exports.PoolStakeDialog({ open: true, onOpenChange: next => changes.push(next), title: 'Stake with Alpha', pending, children: 'FORM' }) };
}
test('pending stake locks form fields and prevents escape or outside dismissal', () => {
  const { tree, changes } = setup(true);
  tree.props.onOpenChange(false);
  assert.deepEqual(changes, []);
  const content = tree.props.children;
  assert.equal(content.props.showCloseButton, false);
  assert.equal(content.props.children.find(child => child.type === 'fieldset').props.disabled, true);
  assert.equal(content.props.children.find(child => child.type === 'DialogFooter').props.children.props.disabled, true);
});
test('idle stake form can be cancelled', () => {
  const { tree, changes } = setup(false);
  tree.props.children.props.children.find(child => child.type === 'DialogFooter').props.children.props.onClick();
  assert.deepEqual(changes, [false]);
});
test('every expanded pool staking view supplies its form to the shared dialog table', () => {
  const dirs = ['polygon','iotex','avalanche','cardano','vechain','ton','multiversx','near','aptos','sui','iota','sonic','algorand'];
  const paths = dirs.map(chain => { const dir = `src/features/${chain}-staking`; return `${dir}/${fs.readdirSync(dir).find(name => name.endsWith('View.tsx'))}`; });
  paths.push('src/features/native-cosmos/NativeCosmosStakingView.tsx');
  for (const path of paths) {
    const file = ts.createSourceFile(path, fs.readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    let forms = 0;
    function visit(node) {
      if (ts.isJsxElement(node) && node.openingElement.tagName.getText(file) === 'StakingTargetTable') {
        assert.ok(node.children.some(child => child.getText(file).includes('staking.execute')), path);
        forms++;
      }
      ts.forEachChild(node, visit);
    }
    visit(file);
    assert.equal(forms, 1, path);
  }
});

test('stake dialog provides a wallet control without requiring users to close their form', () => {
  const { tree } = setup(false);
  assert.ok(tree.props.children.props.children.some(child => child.type === 'WalletButton'));
});
