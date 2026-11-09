import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
import * as viem from 'viem';
const source=ts.transpileModule(fs.readFileSync('src/features/native-cosmos/useNativeCosmosStaking.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function setup({chain='celestia',simulateFailure=false,balance='10000',code=0,account='owner'}={}) {
 const calls=[];const errors=[];
 const client={getChainId:async()=>chain,simulate:async()=>{calls.push('simulate');if(simulateFailure)throw new Error('simulation');return 10;},getBalance:async()=>({amount:balance}),signAndBroadcast:async()=>{calls.push('broadcast');return {code,transactionHash:'hash',rawLog:code?'reverted':''};},disconnect:()=>{}};
 const config={slug:'celestia',id:'celestia',cosmosKitChainName:'celestia',gas:{gasAdjustment:1.5,gasPrices:'0.02utia'},stakingToken:{decimals:6,denom:'utia'},createAdapter:()=>({})};
 const imports={
  react:{useMemo:fn=>fn(),useRef:value=>({current:value}),useState:value=>[value,next=>{if(typeof next==='string')errors.push(next);}]},
  '@cosmos-kit/react':{useChain:()=>({isWalletConnected:true,address:'owner',getOfflineSignerAmino:()=>({getAccounts:async()=>[{address:account}]})})},
  '@tanstack/react-query':{useQuery:()=>({}),useQueryClient:()=>({invalidateQueries:async()=>{}})},
  '@cosmjs/stargate':{TimeoutError:class extends Error {},SigningStargateClient:{connectWithSigner:async()=>client},GasPrice:{fromString:()=>({})},calculateFee:()=>({amount:[{amount:'1'}]})},
  viem,
  '@/lib/chains/native-cosmos/client':{createNativeCosmosClient:()=>({})},
  '@/stores/walletTypeStore':{useWalletTypeStore:fn=>fn({walletType:'native-cosmos'})},
  './messages':{buildNativeCosmosMessages:()=>[]},
 };
 const context={exports:{},require:name=>{if(!(name in imports))throw new Error(name);return imports[name];}};
 vm.runInNewContext(source,context);return {hook:context.exports.useNativeCosmosStaking(config),calls,errors};
}
const action={type:'delegate',validator:'validator',amount:'0.001'};
test('native transaction simulates before broadcasting and concurrent duplicate is ignored',async()=>{
 const {hook,calls}=setup();await Promise.all([hook.execute(action),hook.execute(action)]);assert.deepEqual(calls,['simulate','broadcast']);
});
test('network mismatch, account mismatch, simulation failure, and insufficient fee balance prevent broadcast',async()=>{
 for(const options of [{chain:'wrong'},{account:'different'},{simulateFailure:true},{balance:'1000'}]){
  const {hook,calls,errors}=setup(options);await hook.execute(action);assert.ok(!calls.includes('broadcast'));assert.ok(errors.length>0);
 }
});
test('nonzero deliver code is reported as failure',async()=>{
 const {hook,errors}=setup({code:5});await hook.execute(action);assert.ok(errors.includes('reverted'));
});
