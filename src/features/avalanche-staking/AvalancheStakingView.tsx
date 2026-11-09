'use client';
import { useState } from 'react';
import { formatUnits } from 'viem';
import { Button } from '@/components/ui/button';
import { WalletSelectDialog } from '@/components/layout/WalletSelectDialog';
import { useAvalancheStaking } from './useAvalancheStaking';
export function AvalancheStakingView() {
  const staking = useAvalancheStaking();
  const [open, setOpen] = useState(false);
  const [nodeID, setNode] = useState('');
  const [amount, setAmount] = useState('');
  const [endTime, setEnd] = useState('');
  const errors = [staking.validators.error, staking.balance.error, staking.positions.error, staking.receipt.error].filter(Boolean);
  return <div className="space-y-6"><h1 className="text-2xl font-bold">Avalanche P-Chain 스테이킹</h1><WalletSelectDialog open={open} onOpenChange={setOpen} />{!staking.owner && <Button onClick={() => setOpen(true)}>P-Chain 지갑 연결</Button>}
    <p className="text-sm text-muted-foreground">최소 25 AVAX를 14–365일 위임합니다. 중도 해제는 불가능하며 만기에는 원금과 조건을 충족한 보상이 P-Chain으로 반환됩니다. C-Chain의 AVAX는 Core에서 P-Chain으로 옮긴 뒤 이용하세요.</p>
    <p className="break-all">{staking.owner}</p><p>사용 가능 잔액: {staking.balance.data ? `${formatUnits(staking.balance.data.unlocked, 9)} AVAX` : '조회 전'}</p>{errors.map((error, index) => <p key={index} role="alert" className="text-destructive">{error?.message}</p>)}
    <section className="space-y-3 rounded-xl border p-4"><h2 className="font-semibold">검증자에게 위임</h2>{staking.validators.isPending && <p>검증자 조회 중</p>}<select className="w-full rounded border bg-background p-2" aria-label="Avalanche 검증자" value={nodeID} onChange={(event) => setNode(event.target.value)}><option value="">검증자 선택</option>{staking.validators.data?.map((validator) => <option key={validator.nodeID} value={validator.nodeID}>{validator.nodeID} · 수수료 {validator.delegationFee}% · 기간 종료 {new Date(Number(validator.endTime) * 1000).toLocaleDateString()}</option>)}</select><p className="text-xs text-muted-foreground">검증자 수수료는 보상에서 공제됩니다. 확인되지 않은 예상 수익률은 표시하지 않습니다.</p><label className="block">수량 (AVAX)<input className="block w-full rounded border bg-background p-2" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} /></label><label className="block">위임 종료 (현지 시각)<input className="block w-full rounded border bg-background p-2" type="datetime-local" value={endTime} onChange={(event) => setEnd(event.target.value)} /></label><Button disabled={!staking.owner || staking.pending || !nodeID || !amount || !endTime} onClick={() => staking.execute({ nodeID, amount, endTime: Math.floor(new Date(endTime).getTime() / 1000) })}>기간과 수량 확인 후 지갑에서 위임</Button></section>
    {staking.owner && <section className="space-y-3 rounded-xl border p-4"><h2 className="font-semibold">내 예치</h2>{staking.positions.isPending && <p>조회 중</p>}{staking.positions.data?.length === 0 && <p>진행 중인 예치가 없습니다.</p>}{staking.positions.data?.map((position) => <div key={position.txHash} className="border-b pb-3"><p className="break-all">{position.nodeId}</p><p>{formatUnits(BigInt(position.autoRenew?.compoundedWeight ?? position.amountStaked.find((token) => token.symbol === 'AVAX')?.amount ?? '0'), 9)} AVAX · {position.autoRenew ? '자동 갱신 검증자 예치' : '고정 기간 예치'}</p><p>기간 종료: {new Date(position.endTimestamp * 1000).toLocaleString()}</p><p>조건부 예상 보상: {formatUnits(BigInt(position.estimatedReward), 9)} AVAX</p></div>)}</section>}
    {staking.pending && <p role="status">거래 생성과 지갑 승인을 기다리고 있습니다.</p>}{staking.error && <p role="alert" className="text-destructive">{staking.error}</p>}{staking.hash && <a className="underline break-all" href={`https://subnets.avax.network/p-chain/tx/${staking.hash}`} target="_blank" rel="noreferrer">{staking.receipt.data === 'success' ? '확인된 거래' : '전송됨·온체인 확인 대기'}</a>}
  </div>;
}
