import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const cache=new Map();
function load(path) {
 if(cache.has(path))return cache.get(path);
 const context={exports:{},fetch,TextEncoder,require:name=>name.startsWith('@/')?load(`src/${name.slice(2)}.ts`):name.startsWith('.')?(name.endsWith('.json')?JSON.parse(fs.readFileSync(`src/lib/chains/algorand/${name.slice(2)}`,'utf8')):load(`${path.slice(0,path.lastIndexOf('/'))}/${name.slice(2)}.ts`)):require(name)};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,context);
 cache.set(path,context.exports);return context.exports;
}
const api=load('src/lib/chains/algorand/client.ts');
const validators=await api.readRetiValidators();
console.log('validators',validators.length,'first',JSON.stringify(validators[0],(_,v)=>typeof v==='bigint'?v.toString():v));
const pool=validators.flatMap(v=>v.pools).find(p=>p.balance>0n);
if(pool)console.log('pool yield',pool.appId.toString(),await api.readRetiPoolYield(pool.appId));
console.log('empty positions',await api.readRetiPositions('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ'));

const actions=load('src/features/algorand-staking/actions.ts');
const validator=validators.find(v=>v.gatingType===0 && v.pools.some(p=>p.balance>0n && p.stakers<100n) && v.sunsettingOn===0n);
const simulationOwner=validators[0].owner;
console.log('registration cost',String(await api.readRetiRegistrationCost(simulationOwner)));
const prepared=await actions.prepareRetiAction({kind:'deposit',validatorId:validator.id,amount:(validator.minimum/1000000n+1n).toString()},simulationOwner,async()=>{throw new Error('READ CHECK: signing prohibited');},()=>{});
const group=await prepared.build();
console.log('unsigned simulated deposit',group.transactions.length,'transactions', 'total fees',String(group.transactions.reduce((sum,entry)=>sum+entry.txn.fee,0n)));
const {createRetiClients}=load('src/lib/chains/algorand/contracts.ts');
const clients=createRetiClients();
const ledger=await clients.pool(pool.appId).state.box.getValue('stakers');
const staker=ledger.find(entry=>entry[1]>1000000n);
const positions=await api.readRetiPositions(staker[0]);
const position=positions.find(entry=>entry.poolAppId===pool.appId);
console.log('funded position verified',position.poolAppId.toString(),position.balance.toString());
const withdrawal=await actions.prepareRetiAction({kind:'withdraw',poolAppId:pool.appId,amount:require('viem').formatUnits(position.balance,6)},staker[0],async()=>{throw new Error('READ CHECK: signing prohibited');},()=>{});
console.log('unsigned simulated withdrawal',(await withdrawal.build()).transactions.length,'transactions');
