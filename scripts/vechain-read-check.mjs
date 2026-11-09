import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
import pathModule from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const cache=new Map();
function load(path){if(cache.has(path))return cache.get(path);const c={exports:{},fetch,atob,require:n=>n.startsWith('./')?load(pathModule.join(pathModule.dirname(path),n+'.ts')):n.startsWith('@/')?load(`src/${n.slice(2)}.ts`):require(n)};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,c);cache.set(path,c.exports);return c.exports;}
const api=load('src/lib/chains/vechain/client.ts');
const levels=await api.readVechainLevels();console.log('levels',levels.length);
const {vechainReadClient}=load('src/lib/chains/vechain/transport.ts');const {STARGATE_NFT}=load('src/lib/chains/vechain/contracts.ts');
const {parseAbi}=require('viem');
const tokenId=await vechainReadClient.readContract({address:STARGATE_NFT,abi:parseAbi(['function tokenByIndex(uint256 index) view returns (uint256)']),functionName:'tokenByIndex',args:[0n]});
const position=await api.readVechainPosition(tokenId);console.log('token',position.tokenId.toString(),'status',position.delegation.status,'owner',position.owner,'rewards',String(position.rewards));
const {prepareVechainAction}=load('src/features/vechain-staking/actions.ts');
if(position.rewards>0n){await prepareVechainAction(position.owner,{kind:'claim',tokenId});console.log('unsigned VTHO claim simulation passed');}
const validator=await api.readVechainValidator('0x3970329D7964b9EAA7244c936d18b0846522CD96');
let funded;
for(const address of [position.owner,validator.endorser,'0xBD98ee8a7dACb795E75d00cB661e1148Ea590eFA','0x78508681eE16A0973b6C03EC7ac9987CdF81A404']){const balance=await api.readVechainBalance(address);if(balance.vet>=10000n*10n**18n&&balance.vtho>0n){funded=address;break;}}
if(!funded)throw new Error('No funded public account in inspected set');
await prepareVechainAction(funded,{kind:'stake',levelId:8});console.log('unsigned VET stake simulation passed');
