import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
test('wallet signer is registered for payment and asset transactions as well as app calls',()=>{
 const registered=[];const algorand={setSigner:(...args)=>registered.push(args)};
 const imports={'@algorandfoundation/algokit-utils':{AlgorandClient:{fromConfig:()=>algorand}},'@algorandfoundation/algokit-utils/types/app-client':{AppClient:class{}},'./ValidatorRegistry.json':{},'./StakingPool.json':{}};
 const c={exports:{},require:name=>imports[name]};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/chains/algorand/contracts.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,c);
 c.exports.createRetiClients();assert.equal(registered.length,0);
 const signer=async()=>[];c.exports.createRetiClients('owner',signer);assert.equal(registered.length,1);assert.equal(registered[0][0],'owner');assert.equal(registered[0][1],signer);
});
