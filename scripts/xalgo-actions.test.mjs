import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as algo from 'algosdk';
import * as sdk from '@folks-finance/algorand-sdk';
const owner = algo.encodeAddress(new Uint8Array(32).fill(1));
const proposer = algo.encodeAddress(new Uint8Array(32).fill(2));
function setup(overrides = {}) {
 const c = { exports: {}, require: (n) => ({ algosdk: algo, './sdk': sdk, './client': { xAlgoClient: { getTransactionParams: () => ({ do: async () => ({ fee: 1000n, minFee: 1000n, firstValid: 1n, lastValid: 100n, genesisID: 'mainnet-v1.0', genesisHash: new Uint8Array(32) }) }) }, readXAlgoPosition: async () => ({ available: 100_000_000n, receipt: 5_000_000n, optedIn: false, state: { algoBalance: 12_000_000n, xAlgoCirculatingSupply: 10_000_000n, premium: 0n, canImmediateStake: true, proposersBalances: [{ address: proposer, algoBalance: 12_000_000n }] }, ...overrides }) }, '@/features/algorand-staking/plan': { parseAlgoAmount: (v) => { if (!/^\d+(\.\d{1,6})?$/.test(v)) throw new Error('amount'); return BigInt(Math.round(Number(v) * 1e6)); } } })[n] };
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/features/algorand-liquid-staking/actions.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,c);
 return (action)=>c.exports.prepareXAlgoAction(owner,action);
}
test('xALGO stake opts in before minting and enforces a nonzero minimum receipt',async()=>{
 const result=await setup()({kind:'stake',amount:'1'}); assert.equal(result.transactions[0].assetTransfer?.assetIndex,1134696561n);assert.equal(result.transactions[0].assetTransfer?.amount,0n); assert.ok(result.minimumReceived>0n);
 assert.ok(result.transactions.every(t=>t.sender.toString()===owner));
});
test('xALGO redemption burns the requested asset quantity without an unnecessary opt-in',async()=>{
 const result=await setup({optedIn:true})({kind:'unstake',amount:'1'});
 const transfer=result.transactions.find(t=>t.assetTransfer?.amount===1000000n);assert.equal(transfer.assetTransfer.assetIndex,1134696561n);
});
test('xALGO rejects invalid, zero and excessive input, gas shortfall and paused immediate minting',async()=>{
 for(const amount of ['', '0','-1','0.0000001','100'])await assert.rejects(setup()({kind:'stake',amount}));
 await assert.rejects(setup()({kind:'unstake',amount:'6'}));
 await assert.rejects(setup({state:{canImmediateStake:false}})({kind:'stake',amount:'1'}));
});
