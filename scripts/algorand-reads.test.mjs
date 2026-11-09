import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
const compile=p=>ts.transpileModule(fs.readFileSync(p,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const d={exports:{}};vm.runInNewContext(compile('src/lib/chains/algorand/decode.ts'),d);
function api(clients){const imports={'@algorandfoundation/algokit-utils/types/amount':{AlgoAmount:{MicroAlgos:v=>v}},'./contracts':{createRetiClients:()=>clients,RETI_APP_ID:1n},'./decode':d.exports,algosdk:{},'@algorandfoundation/algokit-utils/types/app-arc56':{getABITupleTypeFromABIStructDefinition:()=>({decode:v=>v}),getABIStructFromABITuple:v=>v}};const c={exports:{},TextEncoder,require:name=>imports[name]};vm.runInNewContext(compile('src/lib/chains/algorand/client.ts'),c);return c.exports;}
const box=()=>({value:{config:{id:1n,owner:'owner',nfdForInfo:0n,minEntryStake:1n,percentToValidator:0n,entryGatingType:0n,rewardTokenId:0n,sunsettingOn:0n},pools:[]}});
function paged(pages){const rounds=[];let index=0;const req={prefix(){return this;},include(){return this;},limit(){return this;},next(){return this;},round(value){rounds.push(value);return this;},async do(){const page=pages[index++];if(page instanceof Error)throw page;return page;}};return {rounds,clients:{algorand:{client:{algod:{getApplicationBoxes:()=>req}}},registry:{appSpec:{structs:{ValidatorInfo:[]}}}}};}
test('all validator pages use the original round and empty pages are valid',async()=>{
 const f=paged([{round:42,boxes:[box()],nextToken:'next'},{round:42,boxes:[]}]);assert.equal((await api(f.clients).readRetiValidators()).length,1);assert.deepEqual(f.rounds,[42]);
 assert.equal((await api(paged([{boxes:[]}]).clients).readRetiValidators()).length,0);
});
test('missing box values, repeated pagination and node failures never become empty lists',async()=>{
 for(const pages of [[{boxes:[{}]}],[{boxes:[],nextToken:'x'},{boxes:[],nextToken:'x'}],[new Error('network')]])await assert.rejects(api(paged(pages).clients).readRetiValidators());
});
test('positions deduplicate pool IDs but reject data for a different owner',async()=>{
 let reads=0;const clients={registry:{send:{call:async()=>({return:[[1n,1n,2n],[1n,1n,2n]]})}},pool:()=>({send:{call:async()=>{reads++;return {return:{account:'owner',balance:0n,totalRewarded:0n,rewardTokenBalance:0n}};}}})};
 const result=await api(clients).readRetiPositions('owner');assert.equal(result.length,1);assert.equal(reads,1);assert.equal(result[0].balance,0n);
 await assert.rejects(api(clients).readRetiPositions('different'),/different/);
});
test('every account and registry read propagates dependency failure',async()=>{
 const fail=async()=>{throw new Error('unavailable');};const clients={registry:{send:{call:fail}},algorand:{client:{algod:{accountInformation:()=>({do:fail})}}}};
 for(const read of [a=>a.readRetiPositions('owner'),a=>a.readRetiRegistrationCost('owner'),a=>a.readAlgorandAccount('owner'),a=>a.readRetiPoolCapacity(1n,'owner',1n)])await assert.rejects(read(api(clients)),/unavailable/);
});
