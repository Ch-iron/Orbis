import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';

const source = fs.readFileSync('src/features/wallet/connection.ts', 'utf8');
const context = { exports: {} };
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, context);
const { connectSelectedWallet } = context.exports;
function setup(overrides = {}) {
  const calls = [];
  return { calls, input: {
    selectedConnectorId: 'walletConnect', activeConnectorId: 'io.metamask', targetChainId: 8217, activeChainId: 37,
    connect: async () => { calls.push('connect'); return { chainId: 37 }; },
    switchChain: async () => { calls.push('switch'); return { id: 8217 }; },
    activate: () => calls.push('activate'), ...overrides,
  } };
}
test('selecting a different wallet reconnects before switching and activating', async () => {
  const { input, calls } = setup();
  await connectSelectedWallet(input);
  assert.deepEqual(calls, ['connect', 'switch', 'activate']);
});
test('same wallet and network reuses connection', async () => {
  const { input, calls } = setup({ activeConnectorId: 'walletConnect', activeChainId: 8217 });
  await connectSelectedWallet(input);
  assert.deepEqual(calls, ['activate']);
});
test('new connection already on target network does not switch', async () => {
  const { input, calls } = setup({ connect: async () => ({ chainId: 8217 }) });
  await connectSelectedWallet(input);
  assert.deepEqual(calls, ['activate']);
});
test('rejected connection never activates', async () => {
  const { input, calls } = setup({ connect: async () => { throw new Error('rejected'); } });
  await assert.rejects(connectSelectedWallet(input), /rejected/);
  assert.deepEqual(calls, []);
});
test('failed or incorrect network switch never activates', async () => {
  for (const switchChain of [async () => { throw new Error('switch failed'); }, async () => ({ id: 37 })]) {
    const { input, calls } = setup({ switchChain });
    await assert.rejects(connectSelectedWallet(input));
    assert.deepEqual(calls, ['connect']);
  }
});
