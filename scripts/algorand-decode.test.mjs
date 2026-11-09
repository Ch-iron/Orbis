import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
const context={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/chains/algorand/decode.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
const {decodeValidator,integer}=context.exports;
const fixture=()=>({config:{id:1n,owner:'owner',nfdForInfo:0n,minEntryStake:1000000n,percentToValidator:50000n,entryGatingType:0n,rewardTokenId:0n,sunsettingOn:0n},pools:[[123n,1n,1000000n],[0n,0n,0n]]});
test('decodes commission as fraction and removes unused pool slots',()=>{
 const result=decodeValidator(fixture());assert.equal(result.commission,0.05);assert.equal(result.pools.length,1);assert.equal(result.minimum,1000000n);
});
test('zero commission and empty pools remain valid',()=>{
 const input=fixture();input.config.percentToValidator=0n;input.pools=[];assert.equal(decodeValidator(input).commission,0);assert.equal(decodeValidator(input).pools.length,0);
});
test('missing, negative, fractional and unsafe integers fail',()=>{
 for(const value of [null,undefined,-1n,-1,1.1,Number.MAX_SAFE_INTEGER+1,'1'])assert.throws(()=>integer(value),/Invalid/);
 for(const value of [null,{},[],{config:{},pools:[]}])assert.throws(()=>decodeValidator(value),/Invalid/);
});
