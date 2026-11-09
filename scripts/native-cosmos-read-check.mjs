import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
import {bech32} from 'bech32';
const context={exports:{},fetch,URLSearchParams,require:()=>({mapBondStatus:status=>status==='BOND_STATUS_BONDED'?'active':'inactive'})};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/chains/native-cosmos/client.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
for(const [name,denom] of [['celestia','utia'],['dydx','adydx']]){
 const client=context.exports.createNativeCosmosClient({name,lcd:`https://${name}-rest.publicnode.com`,stakingToken:{denom}});
 const address=bech32.encode(name,bech32.toWords(new Uint8Array(20)));
 const results=await Promise.allSettled([client.getValidators(),client.getBalance(address),client.getDelegations(address),client.getRewards(address),client.getUnbonding(address),client.getUnbondingSeconds()]);
 console.log(name,results.map((result,index)=>result.status==='fulfilled'?{index,result:Array.isArray(result.value)?{count:result.value.length}:result.value}:{index,error:result.reason.message}));
 if(results.some(result=>result.status==='rejected'))process.exitCode=1;
}
