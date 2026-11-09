import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
const compile=path=>ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const d={exports:{}};vm.runInNewContext(compile('src/lib/chains/algorand/decode.ts'),d);
function api(fetch,clients={}){const c={exports:{},fetch,require:name=>({'./contracts':{createRetiClients:()=>clients},'./decode':d.exports,algosdk:{getApplicationAddress:()=> 'pool'},'@algorandfoundation/algokit-utils/types/app-arc56':{}})[name]};vm.runInNewContext(compile('src/lib/chains/algorand/client.ts'),c);return c.exports;}
test('Nodely percent APY is normalized to the dashboard fraction',async()=>{assert.equal(await api(async()=>({ok:true,json:async()=>({apy:5})})).readRetiPoolYield(1n),0.05);});
test('zero APY is valid, absent, malformed and failed reads are errors',async()=>{
 assert.equal(await api(async()=>({ok:true,json:async()=>({apy:0})})).readRetiPoolYield(1n),0);
 for(const data of [{},{apy:'5'},{apy:-1},{apy:NaN},null])await assert.rejects(api(async()=>({ok:true,json:async()=>data})).readRetiPoolYield(1n));
 await assert.rejects(api(async()=>({ok:false})).readRetiPoolYield(1n));
 await assert.rejects(api(async()=>{throw new Error('network');}).readRetiPoolYield(1n));
});

test('pool capacity reads decoded ARC-56 integer values and treats the limit as full',async()=>{
 for(const count of [199n,200n]) {
  const clients={registry:{send:{call:async ({method})=>({return:method==='findPoolForStaker'?[[1n,1n,2n],true,true]:{maxStakersPerPool:200n}})}},pool:()=>({state:{global:{getValue:async()=>count}}})};
  const result=await api(null,clients).readRetiPoolCapacity(1n,'owner',1n);assert.equal(result.poolAppId,2n);assert.equal(result.full,count===200n);
 }
});
