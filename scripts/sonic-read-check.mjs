import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const cache=new Map();
function load(path){if(cache.has(path))return cache.get(path);const c={exports:{},fetch,require:n=>n.startsWith('.')?load(`src/lib/chains/sonic/${n.slice(2)}.ts`):require(n)};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,c);cache.set(path,c.exports);return c.exports;}
const api=load('src/lib/chains/sonic/client.ts');const indexer=load('src/lib/chains/sonic/indexer.ts');
const validators=await api.readSonicValidators();console.log('validators',validators.length,'active',validators.filter(v=>v.status===0n).length);
console.log('parameters',await api.readSonicParameters(),'base APR',await indexer.readSonicBaseApr(),'names',(await indexer.readSonicValidatorNames()).size);
const owner='0x0000000000000000000000000000000000000001';console.log('empty withdrawals',(await api.readSonicWithdrawals(owner)).length);
const c=load('src/lib/chains/sonic/contracts.ts');const validator=validators.find(v=>v.status===0n);
await api.sonicClient.simulateContract({account:validator.auth,address:c.SFC,abi:c.SFC_ABI,functionName:'delegate',args:[validator.id],value:1n});console.log('unsigned delegate simulation passed');
