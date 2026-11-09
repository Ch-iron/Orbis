import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
import * as viem from 'viem';
import * as chains from 'viem/chains';
function load(path, imports) {
 const context = { exports: {}, require: name => { if (!(name in imports)) throw new Error(name); return imports[name]; } };
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
 return context.exports;
}
const contracts=load('src/lib/chains/ethereum/contracts.ts',{viem});
const owner='0x0000000000000000000000000000000000000001';
function client(readContract, getBalance=async()=>100n) {
 return load('src/lib/chains/ethereum/client.ts',{viem:{...viem,createPublicClient:()=>({readContract,getBalance})},'viem/chains':chains,'./contracts':contracts});
}
test('positions use on-chain rETH ETH value and preserve zero balances',async()=>{
 const api=client(async call=>{
  if(call.functionName==='balanceOf') return call.address===contracts.RETH?500n:0n;
  assert.equal(call.functionName,'getEthValue'); assert.equal(call.args[0],500n); return 600n;
 });
 const balances=await api.readEthereumPositions(owner);
 assert.equal(balances.steth,0n); assert.equal(balances.reth,500n); assert.equal(balances.rethEth,600n);
});
test('empty withdrawals do not query status; claimed requests are excluded',async()=>{
 let count=0;
 assert.equal((await client(async()=>{count++;return [];}).readLidoWithdrawals(owner)).length,0);
 assert.equal(count,1);
 const requests=await client(async call=>call.functionName==='getWithdrawalRequests'?[1n,2n]:[{isClaimed:false,isFinalized:true},{isClaimed:true,isFinalized:true}]).readLidoWithdrawals(owner);
 assert.equal(requests.length,1);assert.equal(requests[0].id,1n);assert.equal(requests[0].isFinalized,true);
});
test('every position read failure propagates instead of becoming zero',async()=>{
 for (const failed of ['balance','balanceOf','getEthValue']) {
  const api=client(async call=>{if(call.functionName===failed) throw new Error(failed);return 0n;},async()=>{if(failed==='balance')throw new Error(failed);return 0n;});
  await assert.rejects(api.readEthereumPositions(owner),new RegExp(failed));
 }
});
test('withdrawal IDs and statuses failures are visible',async()=>{
 for (const failed of ['getWithdrawalRequests','getWithdrawalStatus']) {
  await assert.rejects(client(async call=>{if(call.functionName===failed)throw new Error(failed);return [1n];}).readLidoWithdrawals(owner),new RegExp(failed));
 }
});
test('unresolved Rocket contracts are rejected',async()=>{
 await assert.rejects(client(async()=>viem.zeroAddress).readRocketPool(),/unavailable/);
});
