import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
import pathModule from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const cache=new Map();
function load(path){if(cache.has(path))return cache.get(path);const c={exports:{},fetch,atob,require:n=>n.startsWith('./')?load(pathModule.join(pathModule.dirname(path),n+'.ts')):n.startsWith('@/')?load(`src/${n.slice(2)}.ts`):require(n)};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,c);cache.set(path,c.exports);return c.exports;}
const api=load('src/lib/chains/cardano/client.ts');
const stake='stake1uy89kzrdlpaz5rzu8x95r4qnlpqhd3f8mf09edjp73vcs3qhktrtm';
const pools=await api.readCardanoPools();console.log('pools',pools.length,'account',await api.readCardanoAccount(stake));
const accounts=await fetch('https://api.koios.rest/api/v1/account_addresses',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({_stake_addresses:[stake],_empty:false})}).then(r=>r.json());
const address=accounts[0].addresses[0]; const utxos=await api.cardanoProvider.fetchAddressUTxOs(address);
console.log('public payment address',address,'utxos',utxos.length);
const {prepareCardanoAction}=load('src/features/cardano-staking/actions.ts');
const tx=await prepareCardanoAction(stake,address,utxos,{kind:'delegate',pool:pools.find(x=>x.pool_status==='registered'&&x.retiring_epoch===null).pool_id_bech32});
console.log('unsigned ADA delegation CBOR bytes',tx.length/2);
