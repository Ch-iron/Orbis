import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
import pathModule from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const cache=new Map();
function load(path){if(cache.has(path))return cache.get(path);const c={exports:{},fetch,atob,setTimeout,require:n=>n.startsWith('./')?load(pathModule.join(pathModule.dirname(path),n+'.ts')):n.startsWith('@/')?load(`src/${n.slice(2)}.ts`):require(n)};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,c);cache.set(path,c.exports);return c.exports;}
const api=load('src/lib/chains/ton/client.ts');
const owner='0:ca2041cc43537b6e5e4bd2f4fa6de89122a35d596d075f7af37a4fb9402ed57e';
const pools=await api.readTonPools(); console.log('standard pools',pools.length);
const positions=await api.readTonPositions(owner); console.log('public positions',positions.length,'balance',String(await api.readTonBalance(owner)));
const position=positions.find(x=>!x.withdrawing&&x.active>0n);if(!position)throw new Error('No eligible public position');
const {prepareTonAction}=load('src/features/ton-staking/actions.ts');
const tx=await prepareTonAction(owner,{kind:'withdraw',pool:position.pool});console.log('unsigned whole withdrawal',tx.network,tx.messages[0].amount);
