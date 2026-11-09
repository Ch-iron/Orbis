import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
const source=ts.transpileModule(fs.readFileSync('src/lib/chains/native-cosmos/client.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const config={lcd:'https://example.test',name:'dYdX',stakingToken:{denom:'adydx'}};
function client(fetch) {
 const context={exports:{},fetch,URLSearchParams,require:()=>({mapBondStatus:status=>status==='BOND_STATUS_BONDED'?'active':'inactive'})};
 vm.runInNewContext(source,context);return context.exports.createNativeCosmosClient(config);
}
const ok=body=>({ok:true,json:async()=>body});
test('validators collect all pages and preserve zero commission',async()=>{
 const calls=[];
 const api=client(async url=>{calls.push(url);return ok({validators:[{operator_address:`v${calls.length}`,tokens:'0',jailed:false,status:'BOND_STATUS_BONDED',description:{moniker:'validator',details:''},commission:{commission_rates:{rate:'0'}}}],pagination:{next_key:calls.length===1?'key+/=':null}});});
 const validators=await api.getValidators();assert.equal(validators.length,2);assert.equal(validators[0].commission,0);assert.match(calls[1],/key%2B%2F%3D/);
});
test('repeated page key is an error instead of an infinite loop',async()=>{
 await assert.rejects(client(async()=>ok({validators:[],pagination:{next_key:'same'}})).getValidators(),/Repeated/);
});
test('delegations do not convert USDC rewards into DYDX',async()=>{
 const api=client(async url=>url.includes('/rewards')?ok({rewards:[{validator_address:'v1',reward:[{denom:'usdc',amount:'1500000.1'},{denom:'adydx',amount:'123.4'}]}],total:[{denom:'usdc',amount:'1500000.1'}]}):ok({delegation_responses:[{delegation:{validator_address:'v1'},balance:{denom:'adydx',amount:'1000000000000000000'}}]}));
 const delegations=await api.getDelegations('dydx1example');assert.equal(delegations[0].rewards,'123');
 const rewards=await api.getRewards('dydx1example');assert.equal(rewards.total[0].denom,'usdc');
});
test('empty responses are valid, but malformed lists and dates fail',async()=>{
 assert.equal((await client(async()=>ok({validators:[]})).getValidators()).length,0);
 await assert.rejects(client(async()=>ok({})).getValidators(),/Invalid/);
 await assert.rejects(client(async()=>ok({unbonding_responses:[{validator_address:'v',entries:[{balance:'1',completion_time:'invalid'}]}]})).getUnbonding('address'),/Invalid/);
});
test('network, HTTP and JSON failures propagate for each read path',async()=>{
 for(const fetch of [async()=>{throw new Error('network');},async()=>({ok:false,status:503}),async()=>({ok:true,json:async()=>{throw new Error('json');}})]){
  const api=client(fetch);
  for(const operation of [()=>api.getValidators(),()=>api.getDelegations('address'),()=>api.getRewards('address'),()=>api.getBalance('address'),()=>api.getUnbonding('address'),()=>api.getUnbondingSeconds()])await assert.rejects(operation());
 }
});
test('unbonding duration comes from current parameters',async()=>{
 assert.equal(await client(async()=>ok({params:{unbonding_time:'1213200s'}})).getUnbondingSeconds(),1213200);
});
