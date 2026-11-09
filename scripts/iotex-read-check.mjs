import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
import pathModule from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const cache=new Map();
function load(path){if(cache.has(path))return cache.get(path);const c={exports:{},fetch,atob,require:n=>n.startsWith('./')?load(pathModule.join(pathModule.dirname(path),n+'.ts')):n.startsWith('@/')?load(`src/${n.slice(2)}.ts`):require(n)};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,c);cache.set(path,c.exports);return c.exports;}
const api=load('src/lib/chains/iotex/client.ts');
const candidates=await api.readIotexCandidates();console.log('candidates',candidates.length);
const candidate=candidates.find(x=>x.selfStakingTokens>=1200000n*10n**18n);console.log('candidate',candidate.name,candidate.ownerAddress);
console.log('buckets',(await api.readIotexBuckets(candidate.ownerAddress)).length);
const balance=await api.iotexClient.getBalance({address:candidate.ownerAddress});console.log('balance',String(balance));
const {prepareIotexAction}=load('src/features/iotex-staking/actions.ts');
const [tx]=await prepareIotexAction(candidate.ownerAddress,{kind:'stake',candidate:candidate.name,amount:'100',days:7,autoStake:false});
console.log('unsigned native stake gas',String(await api.iotexClient.estimateGas({...tx,account:candidate.ownerAddress})));
