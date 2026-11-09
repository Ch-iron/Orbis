import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
import pathModule from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const cache=new Map();
function load(path){if(cache.has(path))return cache.get(path);const c={exports:{},fetch,require:n=>n.startsWith('.')?load(pathModule.join(pathModule.dirname(path),n+'.ts')):n.startsWith('@/')?load(`src/${n.slice(2)}.ts`):require(n)};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,c);cache.set(path,c.exports);return c.exports;}
const api=load('src/lib/chains/polygon/client.ts');
const validators=await api.readPolygonValidators();console.log('validators',validators.length);
const owner='0x31cc433e48fa226dd288cdf1a85a1a803c077883';
const positions=await api.readPolygonPositions(owner);console.log('positions',positions.length,'balance',String(await api.readPolygonBalance(owner)),'withdrawals',(await api.readPolygonWithdrawals(owner)).length);
const actions=load('src/features/polygon-staking/actions.ts');
for(const action of [{kind:'claim',id:9n},{kind:'unstake',id:9n,amount:'1'}]){const txs=await actions.preparePolygonAction(owner,action);await api.polygonStakingClient.estimateGas({...txs[0],account:owner});console.log('unsigned POL simulation passed',action.kind);}
