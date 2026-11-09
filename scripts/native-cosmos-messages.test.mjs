import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
import * as viem from 'viem';
import * as bech32Module from 'bech32';
const {bech32}=bech32Module;
const context={exports:{},require:name=>name==='viem'?viem:bech32Module};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/features/native-cosmos/messages.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
const {buildNativeCosmosMessages}=context.exports;
const addr=(prefix,byte=1)=>bech32.encode(prefix,bech32.toWords(new Uint8Array(20).fill(byte)));
const config={bech32Prefix:'celestia',stakingToken:{decimals:6,denom:'utia'}};
const sender=addr('celestia');const validator=addr('celestiavaloper');
test('delegate uses exact micro amount and protobuf field names',()=>{
 const [msg]=buildNativeCosmosMessages(config,sender,{type:'delegate',validator,amount:'1.000001'});
 assert.equal(msg.typeUrl,'/cosmos.staking.v1beta1.MsgDelegate');assert.equal(msg.value.amount.amount,'1000001');assert.equal(msg.value.delegatorAddress,sender);
});
test('reject zero, empty, exponent, negative and excess decimals',()=>{
 for(const amount of ['0','','1e2','-1','0.0000001'])assert.throws(()=>buildNativeCosmosMessages(config,sender,{type:'delegate',validator,amount}));
});
test('reject wrong-chain and wrong-account-type addresses',()=>{
 assert.throws(()=>buildNativeCosmosMessages(config,addr('dydx'),{type:'delegate',validator,amount:'1'}));
 assert.throws(()=>buildNativeCosmosMessages(config,sender,{type:'delegate',validator:sender,amount:'1'}));
});
test('redelegation requires distinct source and target',()=>{
 assert.throws(()=>buildNativeCosmosMessages(config,sender,{type:'redelegate',validator,destination:validator,amount:'1'}));
 const [msg]=buildNativeCosmosMessages(config,sender,{type:'redelegate',validator,destination:addr('celestiavaloper',2),amount:'1'});
 assert.equal(msg.typeUrl,'/cosmos.staking.v1beta1.MsgBeginRedelegate');
});
test('claim deduplicates validators and never substitutes a token amount',()=>{
 const messages=buildNativeCosmosMessages(config,sender,{type:'claim',validators:[validator,validator]});
 assert.equal(messages.length,1);assert.equal(messages[0].value.amount,undefined);
 assert.throws(()=>buildNativeCosmosMessages(config,sender,{type:'claim',validators:[]}));
});
