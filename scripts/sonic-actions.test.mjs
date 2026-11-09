import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
import * as viem from 'viem';
const compile=p=>ts.transpileModule(fs.readFileSync(p,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function load(p,imports){const c={exports:{},require:n=>imports[n]};vm.runInNewContext(compile(p),c);return c.exports;}
const contracts=load('src/lib/chains/sonic/contracts.ts',{viem});
const amount=load('src/features/ethereum-staking/amount.ts',{viem});
const owner='0x0000000000000000000000000000000000000001';
function actions(overrides={}){const readContract=async({functionName})=>{if(overrides.failed)throw new Error('RPC');return ({getValidator:[overrides.inactive?1n:0n,0n,owner,1n,1n,0n,0n],getStake:10n**18n,pendingRewards:overrides.noRewards?0n:1n})[functionName];};return load('src/features/sonic-staking/actions.ts',{viem,'@/lib/chains/sonic/contracts':contracts,'@/lib/chains/sonic/client':{sonicClient:{readContract},readSonicWithdrawal:async()=>({amount:overrides.exists?1n:0n,ready:!!overrides.ready})},'@/features/ethereum-staking/amount':amount}).prepareSonicAction;}
test('delegate encodes exact amount and rejects inactive or absent validator',async()=>{const [tx]=await actions()(owner,{kind:'delegate',validatorId:1n,amount:'1'});assert.equal(tx.value,10n**18n);assert.equal(viem.decodeFunctionData({abi:contracts.SFC_ABI,data:tx.data}).functionName,'delegate');await assert.rejects(actions({inactive:true})(owner,{kind:'delegate',validatorId:1n,amount:'1'}));});
test('undelegate rejects zero, excess balance, missing or duplicate request IDs',async()=>{for(const action of [{amount:'0',requestId:1n},{amount:'2',requestId:1n},{amount:'1'}])await assert.rejects(actions()(owner,{kind:'undelegate',validatorId:1n,...action}));await assert.rejects(actions({exists:true})(owner,{kind:'undelegate',validatorId:1n,amount:'1',requestId:1n}));});
test('withdraw waits for both chain conditions and rewards cannot claim zero',async()=>{await assert.rejects(actions()(owner,{kind:'withdraw',validatorId:1n,requestId:1n}));assert.equal((await actions({ready:true})(owner,{kind:'withdraw',validatorId:1n,requestId:1n})).length,1);await assert.rejects(actions({noRewards:true})(owner,{kind:'claimRewards',validatorId:1n}));});
test('RPC failures prevent transaction creation',async()=>{await assert.rejects(actions({failed:true})(owner,{kind:'delegate',validatorId:1n,amount:'1'}),/RPC/);});
