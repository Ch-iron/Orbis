import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const load = (path, imports) => { const c = { Error, exports: {}, require: (n) => imports[n] }; vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, c); return c.exports; };
const owner = '0x0000000000000000000000000000000000000001';
function setup(options = {}) {
 const state = [], events = [], calls = []; let cursor = 0, account = owner;
 const wallet = { getChainId: async () => options.wrongChain ? 2 : 1, getAddresses: async () => [account], sendTransaction: async () => { calls.push('send'); return '0x01'; } };
 const imports = {
  '@/lib/wallet/receipt': load('src/lib/wallet/receipt.ts', {}),
  react: { useRef: (value) => ({ current: value }), useState: (value) => { const index = cursor++; state[index] = value; return [value, (next) => { state[index] = next; events.push([index,next]); }]; } },
  wagmi: { useAccount: () => ({ address: owner, chainId: 1, isConnected: true }), useWalletClient: () => ({ data: wallet }) },
  '@tanstack/react-query': { useQuery: (query) => query, useQueryClient: () => ({ invalidateQueries() {} }) },
  '@/stores/walletTypeStore': { useWalletTypeStore: (select) => select({ walletType: 'evm' }) },
  '@/features/ethereum-staking/execute': load('src/features/ethereum-staking/execute.ts', {}),
 };
 const protocol = { chain: { id:1,name:'Ethereum' }, chainSlug:'test',provider:'provider',readPosition:async()=>({}), prepare: async () => { calls.push('prepare'); if (options.hold) await options.hold; if (options.changeAccount) account = '0x0000000000000000000000000000000000000002'; return [{to:owner,value:0n,data:'0x'}]; }, client: { estimateGas: async () => { calls.push('simulate'); if (options.failSimulation) throw new Error('simulation failed'); }, waitForTransactionReceipt: async () => ({ status: options.reverted ? 'reverted' : 'success' }) } };
 return { hook:load('src/features/liquid-staking/useEvmLiquidStaking.ts',imports).useEvmLiquidStaking(protocol),calls,state,events };
}
test('liquid EVM execution rejects duplicate submissions while preparing the transaction', async () => {
 let release; const hold = new Promise(resolve=>{release=resolve;}); const s = setup({hold}); const first = s.hook.execute({}); await s.hook.execute({}); release(); await first;
 assert.equal(s.calls.filter(x=>x==='prepare').length,1); assert.equal(s.calls.filter(x=>x==='send').length,1); assert.equal(s.state[0],false); assert.equal(s.state[3],true);
});
test('liquid EVM execution checks actual network and account again before signing', async () => {
 for (const options of [{wrongChain:true},{changeAccount:true}]) { const s=setup(options);await s.hook.execute({});assert.equal(s.calls.includes('send'),false);assert.match(s.state[1],/account or network/); }
});
test('liquid EVM execution never signs failed simulations or reports reverted receipts as confirmed', async () => {
 const failed=setup({failSimulation:true});await failed.hook.execute({});assert.equal(failed.calls.includes('send'),false);assert.equal(failed.state[3],false);
 const reverted=setup({reverted:true});await reverted.hook.execute({});assert.equal(reverted.state[2],'0x01');assert.equal(reverted.state[3],false);assert.match(reverted.state[1],/reverted/);
});
