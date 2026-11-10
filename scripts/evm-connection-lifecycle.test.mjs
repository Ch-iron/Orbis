import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(path, imports) {
 const context = { exports: {}, require: name => imports[name] };
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
 return context.exports;
}
function setup() {
 let slug = 'kaia';
 let approve;
 const calls = [];
 const chainStore = Object.assign(select => select({ selectedChainSlug: slug }), { getState: () => ({ selectedChainSlug: slug }) });
 const { useEvmConnection: runHook } = load('src/features/wallet/useEvmConnection.ts', {
  react: { useRef: current => ({ current }), useState: initial => [initial, () => {}] },
  wagmi: { useAccount: () => ({ isConnected: false }), useConnect: () => ({ connectors: [], connectAsync: () => { calls.push('connect'); return new Promise(resolve => { approve = resolve; }); } }), useSwitchChain: () => ({ switchChainAsync: async () => { calls.push('switch'); return { id: 8217 }; } }) },
  '@/stores/walletTypeStore': { useWalletTypeStore: select => select({ setWalletType: () => calls.push('activate') }) },
  '@/stores/chainStore': { useChainStore: chainStore },
  './connection': load('src/features/wallet/connection.ts', {}),
 });
 return { hook: runHook(), calls, changeChain: () => { slug = 'sui'; }, approve: () => approve({ chainId: 37 }) };
}
test('a delayed wallet approval cannot switch networks or activate after the selected chain changes', async () => {
 const view = setup(); const result = view.hook.connect({ uid: 'metamask' }, 8217);
 view.changeChain(); view.approve();
 assert.equal(await result, false); assert.deepEqual(view.calls, ['connect']);
});
test('a duplicate click cannot create a second wallet connection request', async () => {
 const view = setup(); const first = view.hook.connect({ uid: 'metamask' }, 8217);
 assert.equal(await view.hook.connect({ uid: 'metamask' }, 8217), false);
 view.approve(); assert.equal(await first, true); assert.deepEqual(view.calls, ['connect', 'switch', 'activate']);
});
