import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
import React from 'react';
import * as jsx from 'react/jsx-runtime';
import {renderToStaticMarkup} from 'react-dom/server';
import {formatUnits} from 'viem';
function render(overrides={}){
 const q={data:undefined,error:null,isPending:false};const staking={owner:null,validators:q,account:q,positions:q,registration:q,pending:false,error:null,txIds:[],...overrides};
 const imports={react:React,'react/jsx-runtime':jsx,viem:{formatUnits},'./useRetiStaking':{useRetiStaking:()=>staking},'@/components/ui/button':{Button:({children,...props})=>React.createElement('button',props,children)},'@/components/ui/input':{Input:props=>React.createElement('input',props)},'@/components/layout/WalletSelectDialog':{WalletSelectDialog:()=>null}};
 const c={exports:{},require:name=>imports[name]};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/features/algorand-staking/RetiStakingView.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,c);return renderToStaticMarkup(React.createElement(c.exports.RetiStakingView));
}
test('disconnected user sees connection and real validator metadata',()=>{
 const html=render({validators:{data:[{id:1n,owner:'owneraddress',commission:0,minimum:1000000n,gatingType:1}],error:null}});assert.match(html,/Algorand 지갑 연결/);assert.match(html,/0.00%/);assert.match(html,/1 ALGO/);assert.match(html,/자산 보유 조건 있음/);
});
test('zero balance and registration are shown explicitly; unavailable balances are not zero',()=>{
 const html=render({owner:'owner',account:{data:{amount:0n,minimumBalance:0n}},registration:{data:0n},positions:{data:[]}});assert.match(html,/지갑 잔액: 0 ALGO/);assert.match(html,/Réti 등록 비용: 0 ALGO/);assert.match(html,/예치 내역이 없습니다/);
 const failed=render({owner:'owner',account:{error:new Error('network')}});assert.match(failed,/조회 실패: network/);assert.doesNotMatch(failed,/지갑 잔액: 0 ALGO/);
});
test('position includes compounded ALGO and bonus reward notice without mislabeling bonus as ALGO',()=>{
 const html=render({owner:'owner',positions:{data:[{validatorId:1n,poolAppId:2n,balance:1500000n,totalRewarded:500000n,rewardTokenBalance:999n}]}});assert.match(html,/1.5 ALGO/);assert.match(html,/누적 ALGO 보상: 0.5/);assert.match(html,/보너스 토큰 보상/);assert.doesNotMatch(html,/999 ALGO/);
});
