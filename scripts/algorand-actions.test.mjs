import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
const compile=path=>ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const planContext={exports:{}};vm.runInNewContext(compile('src/features/algorand-staking/plan.ts'),planContext);
function fixture(options={}){
 const calls=[];let guarded;
 const validator={id:1n,minimum:1000000n,gatingType:0,sunsettingOn:0n,pools:[{appId:2n}],rewardTokenId:options.bonus?3n:0n};
 const account={amount:options.balance??100000000n,minimumBalance:100000n,assets:[]};
 const app={appAddress:'registry',params:{call:async x=>x}};
 const algorand={createTransaction:{payment:async x=>x},newGroup:()=>{
  const group={items:[],addAppCallMethodCall(x){this.items.push(x);return this;},addAssetOptIn(x){this.items.push({optIn:x});return this;},async simulate(){calls.push(['simulate',this.items]);if(options.simulationError)throw new Error('simulation');return {simulateResponse:{txnGroups:[{appBudgetAdded:2100}]}};},async send(){calls.push(['send',this.items]);await guarded([{sender:{toString:()=> 'owner'},genesisID:options.wrongNetwork?'testnet-v1.0':'mainnet-v1.0',fee:3000n}],[0]);return {txIds:['confirmed']};}};return group;
 }};
 const imports={'@algorandfoundation/algokit-utils/types/amount':{AlgoAmount:{MicroAlgos:x=>x}},'@/lib/chains/algorand/contracts':{createRetiClients:(_,signer)=>{guarded=signer;return {algorand,registry:app,pool:()=>app};}},'@/lib/chains/algorand/client':{readRetiPoolCapacity:async()=>({poolAppId:2n,full:!!options.full}),readRetiValidators:async()=>[validator],readRetiPositions:async()=>options.positions??[],readRetiRegistrationCost:async()=>100000n,readAlgorandAccount:async()=>account},'./plan':planContext.exports};
 const c={exports:{},require:name=>imports[name]};vm.runInNewContext(compile('src/features/algorand-staking/actions.ts'),c);
 const run=action=>c.exports.executeRetiAction(action,'owner',async()=>{calls.push(['sign']);if(options.rejected)throw new Error('rejected');return [];},()=>{if(options.changed)throw new Error('changed');});
 return {run,calls};
}
const deposit={kind:'deposit',validatorId:1n,amount:'1'};
test('deposit includes registration, simulates before signing and uses computed opcode fee',async()=>{
 const f=fixture();assert.deepEqual(Array.from(await f.run(deposit)),['confirmed']);assert.deepEqual(f.calls.map(x=>x[0]),['simulate','send','sign']);
 const tx=f.calls[1][1][2];assert.equal(tx.args[0].txn.amount,1100000n);assert.equal(tx.extraFee,2000n);
});
test('bonus token opt-in is atomic with the stake',async()=>{const f=fixture({bonus:true});await f.run(deposit);assert.equal(f.calls[1][1][3].optIn.assetId,3n);});
test('simulation failure, account change, wrong network, insufficient balance and rejection stop success',async()=>{
 for(const options of [{full:true},{simulationError:true},{changed:true},{wrongNetwork:true},{balance:100000n},{rejected:true}]){const f=fixture(options);await assert.rejects(f.run(deposit));if(!options.rejected)assert.equal(f.calls.filter(x=>x[0]==='sign').length,0);}
});
test('withdrawals verify ownership and exact amount; full amount is sent instead of magic zero',async()=>{
 await assert.rejects(fixture().run({kind:'withdraw',poolAppId:2n,amount:'1'}));
 const f=fixture({positions:[{validatorId:1n,poolAppId:2n,balance:1000000n}]});await f.run({kind:'withdraw',poolAppId:2n,amount:'1'});const tx=f.calls[1][1][2];assert.equal(tx.method,'removeStake');assert.equal(tx.args[1],1000000n);assert.equal(tx.extraFee,1000n);
});
