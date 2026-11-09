import fs from 'node:fs';import ts from 'typescript';import vm from 'node:vm';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const cache=new Map();
function load(path){if(cache.has(path))return cache.get(path);const c={exports:{},require:n=>n.startsWith('@/')?load(`src/${n.slice(2)}.ts`):n.startsWith('.')?load(`${path.slice(0,path.lastIndexOf('/'))}/${n.slice(2)}.ts`):require(n)};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,c);cache.set(path,c.exports);return c.exports;}
const api=load('src/lib/chains/sui/client.ts');const validators=await api.readSuiValidators();console.log('validators',validators.length);
const v=validators[0];console.log('selected APY',await api.readSuiValidatorYield(v.exchangeRatesId,v.activationEpoch));
const positions=await api.readSuiPositions(v.address);console.log('funded positions',positions.length,'first rewards',positions[0]?.rewards?.toString());
const action=load('src/features/sui-staking/actions.ts');
await action.prepareSuiAction(v.address,{kind:'stake',validator:v.address,amount:'1'});console.log('unsigned stake simulation passed');
await action.prepareSuiAction(v.address,{kind:'withdraw',objectId:positions[0].objectId});console.log('unsigned withdrawal simulation passed');
