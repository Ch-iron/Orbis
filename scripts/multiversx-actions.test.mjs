import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
import * as sdk from '@multiversx/sdk-core';
import * as viem from 'viem';
const owner='erd1q3r6dphmmaly7wg5h0lh2dp7tvc2us46xt606qjr2glwyuggr4tquvex2h';const contract='erd1qqqqqqqqqqqqqqqpqqqqqqqqqqqqqqqqqqqqqqqqqqqqqlhllllsr0pd0j';
function actions(options={}){
 const api={readMultiversxProviders:async()=>options.unknown?[]:[{provider:contract}],readMultiversxPosition:async()=>({active:10n**18n,withdrawable:options.locked?0n:10n**18n,rewards:options.noRewards?0n:1n}),multiversxClient:{getAccount:async()=>({nonce:12n,balance:options.poor?0n:10n**22n}),simulateTransaction:async(tx,check)=>{assert.equal(check,false);assert.equal(tx.signature.length,64);return {raw:{senderShard:{status:'success'},receiverShard:{status:options.failed?'fail':'success'}}};}}};
 const imports={viem,'@multiversx/sdk-core':sdk,'@/lib/chains/multiversx/client':api};const c={exports:{},require:n=>n.startsWith('@multiversx/sdk-core/')?sdk:n==='./simulation'?{assertMultiversxSimulation:r=>{if(r.receiverShard.status!=='success')throw new Error('simulation failed');}}:imports[n]};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/features/multiversx-staking/actions.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,c);
 return (kind,amount='1')=>c.exports.prepareMultiversxAction(owner,{kind,contract,...(['delegate','undelegate'].includes(kind)?{amount}:{})});
}
test('EGLD uses factory payload, correct mainnet, sender nonce and attached amount',async()=>{const tx=await actions()('delegate','1.000000000000000001');assert.equal(tx.signature.length,0);assert.equal(tx.value,1000000000000000001n);assert.equal(tx.chainID,'1');assert.equal(tx.nonce,12n);assert.equal(new TextDecoder().decode(tx.data),'delegate');});
test('invalid amount, unknown pool, insufficient balance and failed simulation reject',async()=>{for(const amount of ['','0','-1','1e3','1.0000000000000000001'])await assert.rejects(actions()('delegate',amount));for(const option of [{unknown:true},{poor:true},{failed:true}])await assert.rejects(actions(option)('delegate'));});
test('undelegate, withdraw and reward actions enforce current contract balances',async()=>{await assert.rejects(actions()('undelegate','2'));await assert.rejects(actions({locked:true})('withdraw'));await assert.rejects(actions({noRewards:true})('claim'));await assert.rejects(actions({noRewards:true})('compound'));for(const [kind,method]of [['undelegate','unDelegate'],['withdraw','withdraw'],['claim','claimRewards'],['compound','reDelegateRewards']])assert.ok(new TextDecoder().decode((await actions()(kind)).data).startsWith(method));});
