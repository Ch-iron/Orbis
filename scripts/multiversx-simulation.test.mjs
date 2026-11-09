import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
const c={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/features/multiversx-staking/simulation.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,c);
const check=c.exports.assertMultiversxSimulation;
test('both sender and receiver shard simulation must succeed',()=>{check({senderShard:{status:'success'},receiverShard:{status:'success'}});for(const input of [null,{}, {senderShard:{status:'success'}},{senderShard:{status:'fail'},receiverShard:{status:'success'}},{senderShard:{status:'success'},receiverShard:{status:'fail'}}])assert.throws(()=>check(input));});
