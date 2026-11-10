import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';

function setup(fail) {
 const messages = [];
 const imports = {
  react: { useState: initial => [initial, () => {}] }, 'react/jsx-runtime': jsx,
  '@xpla/wallet-provider': { WalletStatus: { INITIALIZING: 'initializing' } }, 'lucide-react': {},
  sonner: { toast: { error: message => messages.push(message), success: message => messages.push(message) } },
  '@/components/ui/button': { Button: 'button' },
  '@/components/ui/dropdown-menu': Object.fromEntries(['DropdownMenu','DropdownMenuContent','DropdownMenuItem','DropdownMenuSeparator','DropdownMenuTrigger'].map(name => [name,name])),
  '@/hooks/useWalletInfo': { useWalletInfo: () => ({ isConnected: true, walletAddress: '0xowner', disconnect: async () => { if (fail) throw new Error('Disconnect failed'); } }) },
  '@/stores/chainStore': { useChainStore: select => select({ selectedChainSlug: 'kaia' }) },
  '@/lib/chains/registry': { CHAIN_REGISTRY: { kaia: { name: 'Kaia' } } },
  '@/lib/utils/format': { truncateAddress: value => value },
  '@/components/layout/WalletSelectDialog': {},
 };
 const context = { exports: {}, Error, navigator: { clipboard: { writeText: async () => { if (fail) throw new Error('Clipboard blocked'); } } }, require: name => imports[name] };
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/layout/WalletButton.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, context);
 const content = context.exports.WalletButton().props.children[1].props.children;
 return { messages, copy: content[0].props.onClick, disconnect: content.at(-1).props.onClick };
}
test('disconnect rejection is awaited and shown to the user', async () => {
 const view = setup(true); await view.disconnect(); assert.match(view.messages.join(' '), /Disconnect failed/);
});
test('clipboard denial is reported instead of producing an unhandled rejection', async () => {
 const view = setup(true); await view.copy(); assert.match(view.messages.join(' '), /copy|Clipboard/i);
});
test('successful copy gives visible confirmation', async () => {
 const view = setup(false); await view.copy(); assert.match(view.messages.join(' '), /copied/i);
});
