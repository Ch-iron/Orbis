import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as viem from 'viem';
import * as utils from '@iota/iota-sdk/utils';
const owner='0x'+'1'.repeat(64);
function setup(overrides={}) {
 const calls=[];
 class Transaction {gas='gas';pure={u64:v=>v};setSender(){} object(v){return v;} splitCoins(coin,amounts){calls.push({coin,amounts});return ['split'];} mergeCoins(){} moveCall(call){calls.push(call);}async build(){return new Uint8Array([1]);}}
 const c={exports:{},require:n=>({viem,'@iota/iota-sdk/utils':utils,'@iota/iota-sdk/transactions':{Transaction},'@/lib/chains/iota/client':{iotaClient:{dryRunTransactionBlock:async()=>({effects:{status:{status:overrides.fail?'failure':'success'}}})}},'./client':{SWIRL_PACKAGE:'package',SWIRL_POOL:'pool',SWIRL_METADATA:'metadata',readSwirlPosition:async()=>({available:5_000_000_000n,receipt:2_000_000_000n}),readSwirlCoins:async()=>[{coinObjectId:'coin',balance:'2000000000'}]}})[n]};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/features/iota-liquid-staking/actions.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,c);
 return {run:a=>c.exports.prepareSwirlAction(owner,a),calls};
}
test('Swirl stake and redemption use the official object argument order',async()=>{
 const a=setup();await a.run({kind:'stake',amount:'1'});assert.deepEqual(Array.from(a.calls.at(-1).arguments),['pool','metadata','0x5','split']);
 const b=setup();await b.run({kind:'unstake',amount:'1'});assert.equal(b.calls[0].coin,'coin');assert.deepEqual(Array.from(b.calls.at(-1).arguments),['pool','0x5','metadata','split']);
});
test('Swirl rejects invalid amount, token overspend and failed simulation',async()=>{
 for(const amount of ['', '0','-1','0.0000000001','5'])await assert.rejects(setup().run({kind:'stake',amount}));
 await assert.rejects(setup().run({kind:'unstake',amount:'3'}));await assert.rejects(setup({fail:true}).run({kind:'stake',amount:'1'}));
});
