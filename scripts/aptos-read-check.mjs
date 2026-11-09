import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const cache=new Map();
function load(path){if(cache.has(path))return cache.get(path);const c={exports:{},require:n=>n.startsWith('@/')?load(`src/${n.slice(2)}.ts`):require(n)};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,c);cache.set(path,c.exports);return c.exports;}
const api=load('src/lib/chains/aptos/client.ts');
const validators=await api.readAptosValidators();
console.log('validators',validators.length,'active',validators.filter(x=>x.status==='active').length,'APR',await api.readAptosApr());
console.log('empty positions',(await api.readAptosPositions('0x1')).length);
const pool=validators.find(x=>x.status==='active').address;
const result=await api.aptosClient.queryIndexer({query:{query:`query { delegator_distinct_pool(where:{pool_address:{_eq:"${pool}"}},limit:10) {delegator_address} }`}});
let owner;
for(const row of result.delegator_distinct_pool){if(BigInt(await api.readAptosBalance(row.delegator_address))>1200000000n){owner=row.delegator_address;break;}}
if(!owner)throw new Error('No funded public account in inspected delegators.');
const actions=load('src/features/aptos-staking/actions.ts');
await actions.prepareAptosAction(owner,{kind:'add_stake',pool,amount:'11'});
console.log('unsigned Aptos stake simulation passed');
