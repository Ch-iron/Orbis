import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function setup() {
 const events = {};
 let approve;
 let failDisconnect = false;
 const client = { on: (name, fn) => { events[name] = fn; }, connect: async () => ({ uri: 'wc:pending', approval: () => new Promise(resolve => { approve = resolve; }) }), disconnect: async () => { if (failDisconnect) throw new Error('relay offline'); } };
 const imports = {
  '@walletconnect/sign-client': { init: async () => client },
  zustand: { create: initializer => { let state = initializer(); return { getState: () => state, setState: next => { state = { ...state, ...next }; } }; } },
  '@mysten/sui/utils': { isValidSuiAddress: () => true, normalizeSuiAddress: value => value },
  '@/lib/wallet/constants': { WALLET_CONNECT_PROJECT_ID: 'test-project' },
 };
 const context = { exports: {}, window: { location: { origin: 'http://localhost' } }, require: name => imports[name] };
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/features/sui-staking/walletconnect.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText, context);
 return { ...context.exports, events, failDisconnect: () => { failDisconnect = true; }, approve: () => approve({ topic: 'current', namespaces: { sui: { accounts: ['sui:mainnet:0x1'], methods: ['sui_signTransaction'] } } }) };
}
async function pending(view) {
 const promise = view.connectSuiWalletConnect();
 for (let i = 0; i < 8; i++) await Promise.resolve();
 return { promise };
}
test('disconnect cancels a pending approval instead of allowing a late reconnection', async () => {
 const view = setup(); const { promise } = await pending(view);
 await view.disconnectSuiWalletConnect(); view.approve();
 await assert.rejects(promise, /cancel|changed/i);
 assert.equal(view.useSuiWalletConnect.getState().connection, null);
});
test('a deleted unrelated session does not disconnect the active Sui wallet', async () => {
 const view = setup(); const { promise } = await pending(view); view.approve(); await promise;
 view.events.session_delete({ topic: 'old-session' });
 assert.equal(view.useSuiWalletConnect.getState().connection.address, '0x1');
 view.events.session_delete({ topic: 'current' });
 assert.equal(view.useSuiWalletConnect.getState().connection, null);
});
test('relay failure is reported but cannot retain the local connected account', async () => {
 const view = setup(); const { promise } = await pending(view); view.approve(); await promise;
 view.failDisconnect();
 await assert.rejects(view.disconnectSuiWalletConnect(), /relay offline/);
 assert.equal(view.useSuiWalletConnect.getState().connection, null);
});
