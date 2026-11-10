import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
const address = '0x0000000000000000000000000000000000000001';
const configs = { kaia: { slug:'kaia', evmChainId:8217 }, ethereum:{ slug:'ethereum', evmChainId:1 }, sei:{ slug:'sei', evmChainId:1329, bech32Prefix:'sei', addressResolution: {} }, celestia: { slug:'celestia', bech32Prefix:'celestia' } };
const adapter = { getDelegations() {}, getRewards() {}, getUnbonding() {}, getBalance() {} };
for (const config of Object.values(configs)) config.createAdapter = () => adapter;
const imports = {
 '@mysten/dapp-kit-react': {useCurrentAccount:()=>null},
 '@/features/avalanche-staking/wallet':{useAvalancheWallet:f=>f({connection:null})},
 '@/features/cardano-staking/wallet':{useCardanoWallet:f=>f({connection:null})},
 '@vechain/dapp-kit-react':{useWallet:()=>({account:null})},
 '@tonconnect/ui-react':{useTonWallet:()=>null,useTonConnectUI:()=>[{disconnect(){}}]},
 '@/features/multiversx-staking/wallet':{useMultiversxWallet:f=>f({address:null})},
 '@/features/near-staking/wallet':{useNearWallet:f=>f({address:null})},
 '@aptos-labs/wallet-adapter-react':{useWallet:()=>({connected:false,account:null})},
 '@/features/sui-staking/walletconnect':{useSuiWalletConnect:f=>f({connection:null})},
 '@iota/dapp-kit': {useCurrentAccount:()=>null},
 '@txnlab/use-wallet-react': {useWallet:()=>({activeAddress:null})},
 '@cosmos-kit/react': { useChain: () => ({ isWalletConnected: false }) },
 react:{useMemo: f=>f()},
 '@tanstack/react-query': { useQueries: ({queries}) => queries.map(()=>({})), useQuery:()=>({ data:'sei1associated' }) },
 '@xpla/wallet-provider': {useWallet:()=>({status:'DISCONNECTED'}),useConnectedWallet:()=>null,WalletStatus:{WALLET_CONNECTED:'CONNECTED'}},
 wagmi:{ useAccount:()=>({address,isConnected:true}) },
 '@/stores/walletTypeStore': {useWalletTypeStore:f=>f({walletType:'evm'})},
 '@/stores/klipStore': {useKlipStore:f=>f({klipAddress:null})},
 '@/lib/chains/registry':{ CHAIN_REGISTRY:configs,SORTED_CHAIN_SLUGS:Object.keys(configs)},
 '@/lib/queryKeys': {queryKeys: new Proxy({}, {get:()=>()=>[]})},
 '@/lib/utils/address':{evmToBech32:(_,prefix)=>`${prefix}1converted`},
 '@/lib/chains/address-resolution':{},
};
const context={ exports:{},require:name=>{if(!(name in imports)) throw new Error(name); return imports[name];} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/hooks/useMultiChainStaking.ts','utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText, context);
test('overview uses 0x for EVM, associated address for Sei and no fabricated native address',()=>{
 const {chains} = context.exports.useMultiChainStaking();
 assert.equal(chains[0].address,address);
 assert.equal(chains[1].address,address);
 assert.equal(chains[2].address,'sei1associated');
 assert.equal(chains[3].address,null);
});

test('overview ignores dormant XPLA sessions when another wallet or no wallet is selected', () => {
 const previousWallet = imports['@/stores/walletTypeStore'];
 const previousCosmos = imports['@xpla/wallet-provider'];
 imports['@xpla/wallet-provider'] = { ...previousCosmos, useWallet: () => ({ status: 'CONNECTED' }), useConnectedWallet: () => ({ xplaAddress: 'xpla1old' }) };
 try {
  for (const walletType of [null, 'evm']) {
   imports['@/stores/walletTypeStore'] = { useWalletTypeStore: f => f({ walletType }) };
   const previousEvm = imports.wagmi;
   imports.wagmi = { useAccount: () => ({ isConnected: false }) };
   const current = { exports: {}, require: name => imports[name] };
   vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/hooks/useMultiChainStaking.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, current);
   const result = current.exports.useMultiChainStaking();
   imports.wagmi = previousEvm;
   assert.equal(result.isConnected, false);
  }
 } finally { imports['@/stores/walletTypeStore'] = previousWallet; imports['@xpla/wallet-provider'] = previousCosmos; }
});
