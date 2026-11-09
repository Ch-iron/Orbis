import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
import * as viem from 'viem';
function action(options={}) {
 const calls=[];
 const client={aptosAddress:x=>{if(!/^0x[0-9a-f]+$/.test(x))throw new Error('address');return x;},readAptosValidators:async()=>[{address:'0x2',status:options.inactive?'inactive':'active'}],readAptosStake:async()=>({active:1000000000n,inactive:100000000n,pending:200000000n}),aptosClient:{transaction:{build:{simple:async x=>{calls.push(x);return x;}},simulate:{simple:async()=>[{success:!options.failed,vm_status:'minimum balance'}]}}}};
 const imports={viem,'@/lib/chains/aptos/client':client};const c={exports:{},require:n=>imports[n]};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/features/aptos-staking/actions.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,c);
 return {run:(kind,amount)=>c.exports.prepareAptosAction('0x1',{kind,pool:'0x2',amount}),calls};
}
test('APT exact octas and operation reach the simulated payload',async()=>{const f=action();await f.run('add_stake','11.00000001');assert.equal(f.calls[0].data.functionArguments[1],'1100000001');assert.equal(f.calls[0].data.function,'0x1::delegation_pool::add_stake');});
test('empty, zero, negative, excess decimals and u64 overflow fail before signing',async()=>{for(const value of ['', '0','-1','1e9','1.000000001','184467440738'])await assert.rejects(action().run('add_stake',value));});
test('inactive pool and contract rejection prevent signature request',async()=>{await assert.rejects(action({inactive:true}).run('add_stake','11'));await assert.rejects(action({failed:true}).run('add_stake','1'));});
test('unlock, reactivate and withdraw enforce their own available balances',async()=>{for(const [kind,amount]of [['unlock','11'],['reactivate_stake','3'],['withdraw','2']])await assert.rejects(action().run(kind,amount));for(const kind of ['unlock','reactivate_stake','withdraw'])await action().run(kind,'1');});
