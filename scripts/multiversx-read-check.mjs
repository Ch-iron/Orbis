import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
import pathModule from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const cache=new Map();
function load(path){if(cache.has(path))return cache.get(path);const c={exports:{},fetch,atob,require:n=>n.startsWith('./')?load(pathModule.join(pathModule.dirname(path),n+'.ts')):n.startsWith('@/')?load(`src/${n.slice(2)}.ts`):require(n)};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,c);cache.set(path,c.exports);return c.exports;}
const api=load('src/lib/chains/multiversx/client.ts');
const providers=await api.readMultiversxProviders(); let p; for(const candidate of providers.filter(x=>x.numNodes>0).slice(0,20)){if(BigInt(await api.readMultiversxBalance(candidate.owner))>2n*10n**18n){p=candidate;break;}} if(!p)throw new Error('No funded public provider owner in inspected accounts.');
console.log('providers',providers.length,'APR',p.apr);
console.log('position',await api.readMultiversxPosition(p.provider,p.owner));
const actions=load('src/features/multiversx-staking/actions.ts');
const tx=await actions.prepareMultiversxAction(p.owner,{kind:'delegate',contract:p.provider,amount:'1'});
console.log('unsigned EGLD simulation passed',new TextDecoder().decode(tx.data));
