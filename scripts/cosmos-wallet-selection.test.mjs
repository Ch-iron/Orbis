import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function setup(selected) {
 let posts = 0;
 const wallet = { xplaAddress: 'xpla1owner', post: async () => { posts++; return { result: { txhash: 'hash' } }; } };
 const imports = {
  react: { useCallback: fn => fn },
  '@xpla/wallet-provider': { useConnectedWallet: () => wallet },
  './useWalletInfo': { useWalletInfo: () => ({ connectedWallet: selected ? wallet : null }) },
  '@tanstack/react-query': { useQueryClient: () => ({ invalidateQueries() {} }) },
  './useChain': { useChain: () => ({ adapter: { buildDelegateMsg: () => ({}) } }) },
  '@/stores/chainStore': { useChainStore: select => select({ selectedChainSlug: 'xpla' }) },
  '@/stores/walletTypeStore': { useWalletTypeStore: select => select({ walletType: selected ? 'cosmos' : null }) },
  './useEvmStakingActions': { useEvmStakingActions: () => ({}) },
  './useKlipStakingActions': { useKlipStakingActions: () => ({}) },
  '@/features/xpla-staking/messages': { toXplaMessages: msgs => msgs },
  '@/lib/queryKeys': { queryKeys: new Proxy({}, { get: () => () => [] }) },
  '@/lib/chains/registry': { CHAIN_REGISTRY: { xpla: {} } },
 };
 const context = { exports: {}, setTimeout: () => {}, require: name => imports[name] };
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/hooks/useStakingActions.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
 return { actions: context.exports.useStakingActions(), posts: () => posts };
}
test('dormant XPLA session cannot enable or post a transaction after deselection', async () => {
 const view = setup(false);
 assert.equal(view.actions.isReady, false);
 const result = await view.actions.delegate({ validatorAddress: 'validator', amount: '1' });
 assert.equal(result.success, false); assert.equal(view.posts(), 0);
});
test('explicitly selected XPLA wallet can still post staking transactions', async () => {
 const view = setup(true);
 assert.equal(view.actions.isReady, true);
 assert.equal((await view.actions.delegate({ validatorAddress: 'validator', amount: '1' })).success, true);
 assert.equal(view.posts(), 1);
});
