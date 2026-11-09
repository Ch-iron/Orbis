import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const cache=new Map();
function load(path){if(cache.has(path))return cache.get(path);const c={exports:{},fetch,btoa,TextEncoder,TextDecoder,Uint8Array,require:n=>n.startsWith('@/')?load(`src/${n.slice(2)}.ts`):require(n)};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,c);cache.set(path,c.exports);return c.exports;}
const api=load('src/lib/chains/near/client.ts');
const validators=await api.readNearValidators();const pool=validators[0].account_id;
console.log('validators',validators.length,'selected pool',await api.readNearPool(pool),'APR',await api.readNearApr());
console.log('public account positions',(await api.readNearPositions('near')).length,'balance',await api.readNearBalance('near'));
const actions=load('src/features/near-staking/actions.ts');
const tx=await actions.prepareNearAction('near',{kind:'stake',pool,amount:'1'});
console.log('unsigned NEAR payload prepared',tx.actions[0].functionCall.methodName,tx.actions[0].functionCall.deposit.toString());
