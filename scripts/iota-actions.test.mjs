import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
import * as viem from 'viem';
import * as utils from '@iota/iota-sdk/utils';
const owner=utils.normalizeIotaAddress('0x123');const validator=utils.normalizeIotaAddress('0x456');
function action(options={}){
 const calls=[];
 class Transaction {gas='gas';pure={u64:x=>x,address:x=>x};setSender(x){calls.push(['sender',x]);}splitCoins(...args){calls.push(['split',...args]);return ['coin'];}object(x){return x;}moveCall(x){calls.push(['move',x]);}async build(){if(options.buildFailed)throw new Error('balance');return new Uint8Array();}}
 const imports={viem,'@iota/iota-sdk/utils':utils,'@iota/iota-sdk/transactions':{Transaction},'@/lib/chains/iota/client':{readIotaValidators:async()=>options.inactive?[]:[{address:validator}],readIotaPositions:async()=>options.other?[]:[{objectId:'stake',activationEpoch:2n}],iotaClient:{getLatestIotaSystemState:async()=>({epoch:options.pending?'1':'2'}),dryRunTransactionBlock:async()=>({effects:{status:options.simulationFailed?{status:'failure',error:'simulation'}:{status:'success'}}})}}};
 const c={exports:{},require:n=>imports[n]};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/features/iota-staking/actions.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,c);return {run:a=>c.exports.prepareIotaAction(owner,a),calls};
}
test('stake uses exact nanos and selected validator in the system transaction',async()=>{const f=action();await f.run({kind:'stake',validator,amount:'1.000000001'});assert.equal(f.calls.find(c=>c[0]==='split')[2][0],1000000001n);assert.equal(f.calls.find(c=>c[0]==='move')[1].target,'0x3::iota_system::request_add_stake');});
test('invalid amounts, inactive validator, build failure and failed simulation prevent signing',async()=>{for(const amount of ['0','-1','','1e4','0.0000000001'])await assert.rejects(action().run({kind:'stake',validator,amount}));for(const options of [{inactive:true},{buildFailed:true},{simulationFailed:true}])await assert.rejects(action(options).run({kind:'stake',validator,amount:'1'}));});
test('withdraw requires owned object and next epoch; rewards leave with the stake',async()=>{for(const options of [{other:true},{pending:true}])await assert.rejects(action(options).run({kind:'withdraw',objectId:'stake'}));const f=action();await f.run({kind:'withdraw',objectId:'stake'});assert.equal(f.calls.find(c=>c[0]==='move')[1].arguments[1],'stake');});
