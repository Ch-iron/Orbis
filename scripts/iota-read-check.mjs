import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const cache=new Map();
function load(path){if(cache.has(path))return cache.get(path);const c={exports:{},require:n=>n.startsWith('@/')?load(`src/${n.slice(2)}.ts`):require(n)};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,c);cache.set(path,c.exports);return c.exports;}
const api=load('src/lib/chains/iota/client.ts');
const validators=await api.readIotaValidators();console.log('validators',validators.length,'yields',(await api.readIotaYields()).size);
const zero='0x'+ '0'.repeat(63)+'1';console.log('empty positions',(await api.readIotaPositions(zero)).length);
const funded=[];
for(const validator of validators.slice(0,10)) {const balance=await api.iotaClient.getBalance({owner:validator.address});if(BigInt(balance.totalBalance)>2000000000n){funded.push(validator);break;}}
if(!funded.length)throw new Error('No funded public simulation account in inspected validators.');
const action=load('src/features/iota-staking/actions.ts');
await action.prepareIotaAction(funded[0].address,{kind:'stake',validator:funded[0].address,amount:'1'});console.log('unsigned IOTA stake simulation passed');
let withdrawn=false;
for(const validator of validators.slice(0,15)) {
 const positions=await api.readIotaPositions(validator.address);
 if(!positions.length)continue;
 const balance=await api.iotaClient.getBalance({owner:validator.address});
 if(BigInt(balance.totalBalance)<10000000n)continue;
 await action.prepareIotaAction(validator.address,{kind:'withdraw',objectId:positions[0].objectId});
 console.log('unsigned IOTA withdrawal simulation passed');withdrawn=true;break;
}
if(!withdrawn)throw new Error('No public stake owner found in inspected validator accounts');
