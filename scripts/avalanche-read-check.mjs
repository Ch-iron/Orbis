import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
import pathModule from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const cache=new Map();
function load(path){if(cache.has(path))return cache.get(path);const c={exports:{},fetch,atob,URLSearchParams,Uint8Array,Buffer,require:n=>n.startsWith('./')?load(pathModule.join(pathModule.dirname(path),n+'.ts')):n.startsWith('@/')?load(`src/${n.slice(2)}.ts`):require(n)};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,c);cache.set(path,c.exports);return c.exports;}
const api=load('src/lib/chains/avalanche/client.ts');
const validators=await api.readAvalancheValidators();console.log('validators',validators.length);
const now=await api.avalancheP.getTimestamp();const endTime=Math.floor(new Date(now.timestamp).getTime()/1000)+15*86400;
const validator=validators.find(v=>Number(v.endTime)>endTime);
if(!validator)throw new Error('No validator with a 15-day window');
let funded;
for(const v of validators.slice(0,30))for(const raw of (v.validationRewardOwner ?? v.rewardOwner).addresses){const address=raw.startsWith('P-')?raw:'P-'+raw;const balance=await api.readAvalancheBalance(address);if(balance.unlocked>26_000000000n){funded=address;break;}if(funded)break;}
if(!funded)throw new Error('No funded public account');
const positions=await api.readAvalanchePositions(funded);console.log('public account positions',positions.length);
const {prepareAvalancheAction}=load('src/features/avalanche-staking/actions.ts');
const prepared=await prepareAvalancheAction(funded,{nodeID:validator.nodeID,amount:'25',endTime});
console.log('unsigned delegation bytes',prepared.transaction.toBytes().length,'UTXOs',prepared.transaction.utxos.length,'amount',prepared.amount.toString());
