import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
import React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import {renderToStaticMarkup} from 'react-dom/server';
function load(path,imports) {
 const context={exports:{},require:name=>{if(!(name in imports))throw new Error(name);return imports[name];}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,context);return context.exports;
}
const options=load('src/lib/wallet/evm-options.ts',{}).EVM_WALLET_OPTIONS;
function render(slug,projectId='project',pending=false,evmChainId){
 const config={slug,evmChainId:slug === 'avalanche' ? undefined : 1,evmWalletOptions:slug === 'avalanche' ? [] : options,cosmosWalletOptions:[{label:'Old native option'}]};
 const wrapper=({children})=>React.createElement('div',null,children);
 const imports={
  'next/image': ({ unoptimized, ...props }) => React.createElement('img', props),
  react:React,'react/jsx-runtime':jsxRuntime,'@xpla/wallet-provider':{ConnectType:{}},lucide:{},
  '@/features/wallet/useEvmConnection':{useEvmConnection:()=>({connectors:[],pending,error:null})},
  '@/features/avalanche-staking/AvalancheWalletOptions': {AvalancheWalletOptions:()=>null},
  '@/features/cardano-staking/CardanoWalletOptions': {CardanoWalletOptions:()=>null},
  '@/features/vechain-staking/VechainWalletOptions': {VechainWalletOptions:()=>null},
  '@/features/ton-staking/TonWalletOptions': {TonWalletOptions:()=>null},
  '@/features/multiversx-staking/MultiversxWalletOptions': {MultiversxWalletOptions:()=>null},
  '@/features/near-staking/NearWalletOptions': {NearWalletOptions:()=>null},
  '@/features/aptos-staking/AptosWalletOptions': {AptosWalletOptions:()=>null},
  '@/features/sui-staking/SuiWalletOptions': {SuiWalletOptions:()=>null},
  '@/features/iota-staking/IotaWalletOptions': {IotaWalletOptions:()=>null},
  '@/features/algorand-staking/AlgorandWalletOptions': {AlgorandWalletOptions:()=>null},
  '@/features/native-cosmos/NativeCosmosWalletOptions':{NativeCosmosWalletOptions:()=>null},
  '@/lib/wallet/evm-options':{EVM_WALLET_OPTIONS:options},
  '@/lib/wallet/constants':{WALLET_CONNECT_PROJECT_ID:projectId},
  'lucide-react':{Check:()=>null},
  '@/components/ui/dialog':{Dialog:wrapper,DialogContent:wrapper,DialogHeader:wrapper,DialogTitle:wrapper,DialogDescription:wrapper},
  '@/hooks/useWalletInfo':{useWalletInfo:()=>({availableConnections:[],availableInstallations:[]})},
  '@/stores/walletTypeStore':{useWalletTypeStore:f=>f({setWalletType:()=>{}})},
  '@/stores/chainStore':{useChainStore:f=>f({selectedChainSlug:slug})},
  '@/lib/chains/registry':{CHAIN_REGISTRY:{[slug]:config}},
  '@/lib/utils/wallet-detection':{isWalletInstalled:()=>false},
 };
 const {WalletSelectDialog}=load('src/components/layout/WalletSelectDialog.tsx',imports);
 return renderToStaticMarkup(React.createElement(WalletSelectDialog,{open:true,onOpenChange:()=>{},evmChainId}));
}
test('EVM chains show only MetaMask and WalletConnect, including XPLA and Sei',()=>{
 for(const slug of ['kaia','sei','xpla','ethereum']){
  const html=render(slug);assert.equal((html.match(/<button/g)||[]).length,2);assert.match(html,/MetaMask/);assert.match(html,/WalletConnect/);assert.doesNotMatch(html,/Klip|Old native option/);
 }
});
test('missing project ID disables WalletConnect and pending connection disables both',()=>{
 assert.equal((render('kaia',undefined).match(/disabled=""/g)||[]).length,0);
 assert.equal((render('kaia','').match(/disabled=""/g)||[]).length,1);
 assert.equal((render('kaia','project',true).match(/disabled=""/g)||[]).length,2);
});

test('Avalanche C-Chain requests use the common EVM wallet choices',()=>{
 const html=render('avalanche','project',false,43114); assert.match(html,/MetaMask/); assert.match(html,/WalletConnect/);
});
