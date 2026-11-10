import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import * as jsx from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
function load(file, imports) {
 const context={exports:{},Error,console,setTimeout:()=>0,require:(name)=>{if(!(name in imports))throw new Error(name);return imports[name];}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2022}}).outputText,context);return context.exports;
}
const wrapper = function Wrapper({children}) { return React.createElement('div',null,children); };
const card=Object.fromEntries(['Card','CardHeader','CardTitle','CardContent','CardDescription'].map(k=>[k,wrapper]));
function evm(options={}) {
 let invalidated=0;
 const client={waitForTransactionReceipt:async({onReplaced})=>{if(options.reason)onReplaced?.({reason:options.reason});return {status:options.status??'success'};}};
 const imports={'@/lib/wallet/receipt':load('src/lib/wallet/receipt.ts',{}),react:{useCallback:f=>f},wagmi:{useAccount:()=>({address:'0x0000000000000000000000000000000000000001'}),usePublicClient:()=>options.missing?undefined:client,useWriteContract:()=>({writeContractAsync:async()=>'0x123'}),useSendTransaction:()=>({sendTransactionAsync:async()=>'0x123'})},'@tanstack/react-query':{useQueryClient:()=>({invalidateQueries:()=>invalidated++})},'@/stores/chainStore':{useChainStore:f=>f({selectedChainSlug:'kaia'})},'@/lib/chains/registry':{CHAIN_REGISTRY:{kaia:{evmChainId:8217,stakingToken:{decimals:18},publicDelegation:{stakingAbi:[]}}}},'@/lib/utils/address':{evmToBech32:()=>''},'@/lib/queryKeys':{queryKeys:new Proxy({},{get:()=>()=>[]})}};
 return {actions:load('src/hooks/useEvmStakingActions.ts',imports).useEvmStakingActions(),invalidated:()=>invalidated};
}
test('legacy EVM staking never reports a reverted receipt as successful',async()=>{const s=evm({status:'reverted'});await assert.rejects(s.actions.delegate({validatorAddress:'0x1',amount:'1'}),/revert/i);assert.equal(s.invalidated(),0);});
test('legacy EVM staking rejects cancelled replacements and missing receipt clients',async()=>{for(const options of [{reason:'cancelled'},{reason:'replaced'},{missing:true}]) await assert.rejects(evm(options).actions.delegate({validatorAddress:'0x1',amount:'1'}));});
test('legacy EVM staking accepts a successful repriced receipt',async()=>{assert.equal((await evm({reason:'repriced'}).actions.delegate({validatorAddress:'0x1',amount:'1'})).success,true);});
test('history placeholders never carry transactions across accounts or chains',()=>{
 const imports={'@tanstack/react-query':{useQuery:q=>q,keepPreviousData:d=>d},'./useChain':{useChain:()=>({adapter:{},config:{}})},'./useWalletInfo':{useWalletInfo:()=>({walletAddress:'owner'})},'@/stores/chainStore':{useChainStore:f=>f({selectedChainSlug:'sei'})},'@/lib/queryKeys':{queryKeys:{txHistory:(chain,owner,page)=>['txHistory',chain,owner,page]}}};
 const query=load('src/hooks/useStaking.ts',imports).useTxHistory(2), old={entries:['old']};
 assert.equal(query.placeholderData(old,{queryKey:['txHistory','kaia','owner',1]}),undefined);
 assert.equal(query.placeholderData(old,{queryKey:['txHistory','sei','other',1]}),undefined);
 assert.equal(query.placeholderData(old,{queryKey:['txHistory','sei','owner',1]}),old);
});
function chart(query) {
 const imports={'react/jsx-runtime':jsx,'@/components/ui/card':card,'@/components/ui/chart':{ChartContainer:wrapper,ChartTooltip:wrapper,ChartTooltipContent:wrapper},recharts:new Proxy({},{get:()=>wrapper}),'@/hooks/useDelegations':{},'@/hooks/useStaking':{useDelegations:()=>query},'@/hooks/useChain':{useChain:()=>({config:{stakingToken:{symbol:'SEI',decimals:6}}})},'@/hooks/useTokenPrice':{useTokenPrice:()=>({price:2,isLoading:false})},'@/lib/utils/format':{formatTokenAmount:(s)=>String(Number(s)/1e6)},'@/components/ui/skeleton':{Skeleton:wrapper},'@/features/staking/allocation':load('src/features/staking/allocation.ts',{})};
 return renderToStaticMarkup(React.createElement(load('src/components/portfolio/StakingChart.tsx',imports).StakingChart));
}
test('staking overview distinguishes failed and empty data without fabricated history',()=>{
 assert.match(chart({error:new Error('RPC offline')}),/RPC offline/);
 assert.match(chart({data:[]}),/No active delegations/);
 assert.doesNotMatch(fs.readFileSync('src/components/portfolio/StakingChart.tsx','utf8'),/generateMockData|Math\.sin/);
});
function nodes(element,type) {
 if(!element||typeof element!=='object')return [];
 if(Array.isArray(element))return element.flatMap(item=>nodes(item,type));
 return [...(element.type===type?[element]:[]),...nodes(element.props?.children,type)];
}
test('staking allocation legend lists named slices, Other and shares as text',()=>{
 const position=(name,amount)=>({validatorAddress:name,validatorName:name,amount,rewards:'0'});
 const html=chart({data:[position('Alpha','4000000'),position('Beta','3000000'),position('Gamma','2000000'),position('Delta','600000'),position('Echo','400000')]});
 for(const text of ['Alpha','Beta','Gamma','Other (2 positions)','40.00%','10.00%','1 SEI'])assert.ok(html.includes(text),text);
 assert.doesNotMatch(html,/Delta|Echo/);
});
test('mobile navigation closes its drawer when a destination is selected',()=>{
 let closed=0; const Link=wrapper;
 const imports={'react/jsx-runtime':jsx,'next/link':Link,'next/navigation':{usePathname:()=>'/overview'},'next/image':wrapper,'@/lib/utils':{cn:(...s)=>s.join(' ')},'@/stores/chainStore':{useChainStore:f=>f({selectedChainSlug:'sei'})},'@/lib/navigation':{getNavItems:()=>[{label:'Overview',href:'/overview',group:'global',icon:wrapper},{label:'Staking',href:'/stake/sei',group:'chain',icon:wrapper}]},'@/components/common/ChainSelector':{SidebarChainSelector:wrapper}};
 const tree=load('src/components/layout/MobileNav.tsx',imports).MobileNav({onNavigate:()=>closed++});
 for(const link of nodes(tree,Link))link.props.onClick?.();assert.equal(closed,2);
});
test('overview shows a failed read as unavailable and labels Sei yield as APR',()=>{
 const chain={config:{slug:'sei',name:'Sei',logo:'/sei.png',stakingToken:{decimals:6,symbol:'SEI'}},address:'owner',apy:.05,delegationsError:new Error('offline')};
 const imports={'react/jsx-runtime':jsx,'next/image':wrapper,'next/link':wrapper,'@/components/ui/card':card,'@/components/ui/button':{Button:wrapper},'@/components/ui/skeleton':{Skeleton:wrapper},'@/components/ui/tooltip':{Tooltip:wrapper,TooltipContent:wrapper,TooltipTrigger:wrapper},'lucide-react':{ArrowRight:wrapper},'@/lib/utils/format':{formatTokenAmount:()=> '0',formatRewardDisplay:()=>({value:'0'})}};
 const html=renderToStaticMarkup(React.createElement(load('src/components/overview/ChainStakingCard.tsx',imports).ChainStakingCard,{chain}));assert.match(html,/Unavailable/);assert.match(html,/>APR</);
});
test('history resets page state by chain and account identity',()=>{
 let chain='sei',owner='one';
 const imports={'react/jsx-runtime':jsx,react:{useState:()=>[1,()=>{}]},'@/hooks/useWalletInfo':{useWalletInfo:()=>({isConnected:true,walletAddress:owner})},'@/hooks/useChain':{useChain:()=>({config:{slug:chain,stakingToken:{}}})},'@/hooks/useStaking':{},'@/components/ui/card':card,'@/components/ui/table':{},'@/components/ui/badge':{},'@/components/ui/button':{},'@/components/ui/skeleton':{},'@/lib/utils/format':{},'lucide-react':{},'next/image':wrapper};
 const View=load('src/components/history/HistoryView.tsx',imports).HistoryView;
 const first=View().key;owner='two';assert.notEqual(View().key,first);const second=View().key;chain='kaia';assert.notEqual(View().key,second);
});
test('validator query errors do not display a stale actionable validator list',()=>{
 const hooks={useState:v=>[v,()=>{}],useMemo:f=>f()};
 const imports={'react/jsx-runtime':jsx,react:hooks,'@/hooks/useChain':{useChain:()=>({config:{slug:'sei',stakingToken:{}}})},'@/hooks/useStakingApy':{useStakingApy:()=>({apy:null})},'@/hooks/useStaking':{useValidators:()=>({data:[{address:'v',name:'Stale validator',status:'active',commission:0,votingPower:'1'}],error:new Error('validators offline')}),useDelegations:()=>({data:[]})},'@/features/staking/validator-yield':{getValidatorYield:()=>null},'@/lib/utils/format':{formatTokenAmount:()=> '1',formatPercentage:()=> '0%'},'next/image':wrapper,'./StakeDialog':{StakeDialog:wrapper}};
 for(const [path,names] of Object.entries({'card':['Card','CardHeader','CardTitle','CardContent'],'table':['Table','TableBody','TableCell','TableHead','TableHeader','TableRow'],'button':['Button'],'input':['Input'],'badge':['Badge'],'skeleton':['Skeleton'],'switch':['Switch'],'label':['Label']}))imports['@/components/ui/'+path]=Object.fromEntries(names.map(n=>[n,wrapper]));imports['lucide-react']={ArrowUpDown:wrapper,Search:wrapper,Check:wrapper};
 const html=renderToStaticMarkup(React.createElement(load('src/components/staking/ValidatorTable.tsx',imports).ValidatorTable));assert.match(html,/validators offline/);assert.doesNotMatch(html,/Stale validator/);
});
function dialog(name,values=[]) {
 let cursor=0;const changes=[];
 const imports={'react/jsx-runtime':jsx,react:{useState:initial=>{const index=cursor++;return [values[index]??initial,value=>changes.push([index,value])];}},'@/hooks/useChain':{useChain:()=>({config:{slug:'sei',stakingToken:{decimals:6,symbol:'SEI'},unbondingDays:21}})},'@/hooks/useStaking':{useRewards:()=>({data:{total:'10000000'}}),useDelegations:()=>({data:[]}),useBalance:()=>({data:'10000000'})},'@/hooks/useStakingActions':{useStakingActions:()=>({isReady:true})},'@/stores/exchangeStore':{useExchangeStore:()=>({addresses:[]})},'@/lib/utils/format':load('src/lib/utils/format.ts',{}),'@/components/common/TxStatusToast':{},'lucide-react':{Loader2:wrapper,Plus:wrapper,Trash2:wrapper}};
 for(const file of ['dialog','button','input','label','select','separator'])imports['@/components/ui/'+file]=new Proxy({},{get:()=>wrapper});
 const Component=load(`src/components/staking/${name}.tsx`,imports)[name];
 return {tree:Component({open:true,onOpenChange(){},delegation:{amount:'1234567',validatorAddress:'v',validatorName:'Validator'}}),changes};
}
test('split rewards renders invalid scientific notation as a field error instead of crashing',()=>{const {tree}=dialog('SplitRewardsDialog',['','1e3']);assert.match(renderToStaticMarkup(tree),/Enter decimal amounts/);});
test('unstake rejects amounts above the delegation and MAX preserves all raw units',()=>{
 const s=dialog('UnstakeDialog',['2']);assert.match(renderToStaticMarkup(s.tree),/within your staked balance/);
 const max=nodes(s.tree,wrapper).find(n=>n.props.children==='MAX');max.props.onClick();assert.equal(s.changes[0][1],'1.234567');
});
test('header separates the price strip from wallet controls on narrow screens',()=>{
 const TokenInfo=()=>null;
 const imports={'react/jsx-runtime':jsx,react:{useState:v=>[v,()=>{}]},'next/navigation':{usePathname:()=>'/portfolio'},'lucide-react':{Menu:wrapper},'@/components/ui/button':{Button:wrapper},'@/components/ui/sheet':{Sheet:wrapper,SheetContent:wrapper,SheetTrigger:wrapper,SheetTitle:wrapper},'./WalletButton':{WalletButton:wrapper},'./ThemeToggle':{ThemeToggle:wrapper},'@/components/common/ChainSelector':{TokenInfo},'./MobileNav':{MobileNav:wrapper}};
 const tree=load('src/components/layout/Header.tsx',imports).Header();
 const rows=nodes(tree,'div').filter(n=>nodes(n,TokenInfo).length===1);
 assert.ok(rows.some(n=>n.props.className?.includes('md:hidden')&&n.props.className?.includes('pb-2')));
 assert.ok(rows.some(n=>n.props.className?.includes('hidden md:block')));
});
