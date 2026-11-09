import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
import * as viem from 'viem';
import * as near from '@near-wallet-selector/core';
function action(options={}) {
 const api={assertNearAccount:x=>{if(!x.includes('.'))throw new Error('account');},readNearValidators:async()=>[{account_id:'pool.near',is_slashed:!!options.slashed}],readNearPool:async()=>({paused:!!options.paused}),readNearBalance:async()=>viem.parseUnits('2',24).toString(),readNearPosition:async()=>({staked:viem.parseUnits('2',24),unstaked:viem.parseUnits('1',24),canWithdraw:!options.locked})};
 const imports={viem,'@near-wallet-selector/core':near,'@/lib/chains/near/client':api};const c={exports:{},require:n=>imports[n]};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/features/near-staking/actions.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,c);
 return (kind,amount)=>c.exports.prepareNearAction('owner.near',{kind,pool:'pool.near',amount});
}
test('NEAR stake attaches exact yoctoNEAR; withdrawal attaches zero',async()=>{const stake=await action()('stake','1.000000000000000000000001');assert.equal(stake.actions[0].functionCall.deposit,1000000000000000000000001n);const withdrawal=await action()('withdraw','1');assert.equal(withdrawal.actions[0].functionCall.deposit,0n);assert.equal(JSON.parse(new TextDecoder().decode(withdrawal.actions[0].functionCall.args)).amount,viem.parseUnits('1',24).toString());});
test('invalid amounts, overspend, paused and slashed pools are rejected',async()=>{for(const amount of ['','0','-1','1e2','0.0000000000000000000000001','2'])await assert.rejects(action()('stake',amount));await assert.rejects(action({paused:true})('stake','1'));await assert.rejects(action({slashed:true})('stake','1'));});
test('withdraw checks contract lock rather than wall-clock estimate',async()=>{await assert.rejects(action({locked:true})('withdraw','1'));await assert.rejects(action()('unstake','3'));await assert.rejects(action()('withdraw','2'));await action()('unstake','2');});
