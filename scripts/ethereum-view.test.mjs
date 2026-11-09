import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
import React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import * as viem from 'viem';
function render(overrides={}) {
 const query={data:undefined,error:null,isLoading:false};
 const staking={positions:query,withdrawals:query,lido:query,rocket:query,pending:false,error:null,hashes:[],confirmedHashes:[],connected:false,correctNetwork:false,...overrides};
 const imports={react:React,'react/jsx-runtime':jsxRuntime,viem,'./useEthereumStaking':{useEthereumStaking:()=>staking},'@/components/layout/WalletSelectDialog':{WalletSelectDialog:()=>null}};
 const context={exports:{},require:name=>{
  if(imports[name])return imports[name];
  if(name==='@/components/ui/button')return {Button:({children,...props})=>React.createElement('button',props,children)};
  if(name==='@/components/ui/input')return {Input:props=>React.createElement('input',props)};
  if(name==='@/components/ui/card')return new Proxy({},{get:()=>({children})=>React.createElement('div',null,children)});
  throw new Error(name);
 }};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/features/ethereum-staking/EthereumStakingView.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,context);
 return renderToStaticMarkup(React.createElement(context.exports.EthereumStakingView));
}
test('disconnected page offers connection and both selected services without inventing balances',()=>{
 const html=render();
 assert.match(html,/Connect to Ethereum Mainnet/);assert.match(html,/Lido/);assert.match(html,/Rocket Pool/);assert.match(html,/<p>- ETH<\/p>/);
});
test('actual position shows different rETH and ETH amounts',()=>{
 const html=render({connected:true,correctNetwork:true,positions:{data:{eth:0n,steth:2n*10n**18n,reth:10n**18n,rethEth:12n*10n**17n}}});
 assert.match(html,/1\.2/);assert.match(html,/rETH/);
});
test('pending Lido withdrawal has no fabricated completion date and is not claimable',()=>{
 const html=render({connected:true,correctNetwork:true,withdrawals:{data:[{id:1n,amountOfStETH:10n**18n,isFinalized:false}]}});
 assert.match(html,/No fixed completion date/);assert.match(html,/<button disabled="">Claim ETH/);
});
test('failed reads show the error, not a zero balance',()=>{
 const html=render({positions:{error:new Error('RPC unavailable')}});
 assert.match(html,/RPC unavailable/);assert.match(html,/role="alert"/);
});
