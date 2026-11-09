'use client';
import { useState } from 'react';
import { fromNano } from '@ton/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WalletSelectDialog } from '@/components/layout/WalletSelectDialog';
import { useTonStaking } from './useTonStaking';
export function TonStakingView() {
  const [pool, setPool] = useState('');
  const staking = useTonStaking(pool);
  const [amount, setAmount] = useState('');
  const [open, setOpen] = useState(false);
  const errors = [staking.pools.error, staking.poolInfo.error, staking.positions.error, staking.balance.error, staking.receipt.error].filter(Boolean);
  const ready = !!staking.owner && !staking.pending;
  return <div className="space-y-6"><h1 className="text-2xl font-bold">TON 검증자 풀 스테이킹</h1><p className="text-sm text-muted-foreground">표준 nominator-pool을 사용합니다. 예치 수량에 처리 수수료 1 TON이 추가됩니다. 출금은 전액만 가능하며, 출금 요청에도 1 TON을 보내고 사용하지 않은 비용은 반환받습니다. 보상은 예치 잔액에 합산됩니다.</p>
    <WalletSelectDialog open={open} onOpenChange={setOpen} />{!staking.owner && <Button onClick={() => setOpen(true)}>TON 지갑 연결</Button>}<p>잔액: {staking.balance.data !== undefined ? `${fromNano(staking.balance.data)} TON` : '조회 전'}</p>
    {errors.map((error, index) => <p key={index} role="alert" className="text-destructive">{error?.message}</p>)}
    <section className="rounded-xl border p-4 space-y-4"><h2 className="font-semibold">검증자 풀 선택</h2>{staking.pools.isPending && <p>조회 중</p>}<select className="w-full rounded border bg-background p-2" aria-label="TON 검증자 풀" value={pool} onChange={(event) => setPool(event.target.value)}><option value="">풀 선택</option>{staking.pools.data?.filter((item) => item.cycle_end * 1000 > staking.pools.dataUpdatedAt).map((item) => <option key={item.address} value={item.address}>{item.name} · APY {Number.isFinite(item.apy) ? `${item.apy.toFixed(2)}%` : '조회 불가'} · 인원 {item.current_nominators}/{item.max_nominators}</option>)}</select>
      {staking.poolInfo.data && <p>최소 예치 {fromNano(staking.poolInfo.data.minStake)} TON · 검증자 보상 몫 {(staking.poolInfo.data.commission * 100).toFixed(2)}% · 인원 {staking.poolInfo.data.count.toString()}/{staking.poolInfo.data.capacity.toString()}</p>}
      <p className="text-xs text-muted-foreground">APY(연 복리 수익률)는 TonAPI가 제공하는 추정치입니다. 풀 운영자와 조건을 확인한 후 선택하세요.</p><Input aria-label="TON 예치 수량" placeholder="예치할 TON 수량 (처리 수수료 제외)" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} /><Button disabled={!ready || !pool || !amount || !staking.poolInfo.data} onClick={() => staking.execute({ kind: 'stake', pool, amount })}>예치 수량 + 1 TON 전송</Button>
    </section>
    {staking.owner && <section className="rounded-xl border p-4 space-y-4"><h2 className="font-semibold">내 표준 검증자 풀 예치</h2>{staking.positions.isPending && <p>조회 중</p>}{staking.positions.data?.length === 0 && <p>예치 내역이 없습니다.</p>}{staking.positions.data?.map((position) => <div key={position.pool} className="border-b pb-3 space-y-2"><p className="break-all">{position.pool}</p><p>활성 {fromNano(position.active)} · 예치 대기 {fromNano(position.pending)} TON</p><p>{position.withdrawing ? '출금 요청 처리 대기' : '전액 출금 요청 가능'}</p><Button variant="outline" disabled={!ready || position.withdrawing || position.active + position.pending === BigInt(0)} onClick={() => staking.execute({ kind: 'withdraw', pool: position.pool })}>1 TON을 보내 전액 출금 요청</Button></div>)}</section>}
    {staking.pending && <p role="status">지갑 승인을 기다리고 있습니다.</p>}{staking.error && <p role="alert" className="text-destructive">{staking.error}</p>}{staking.submitted && <div><p role="status">{staking.receipt.data === 'success' ? '풀 계약의 거래 처리를 확인했습니다.' : staking.receipt.data === 'failed' ? '거래 실행에 실패했습니다. 반환 내역을 확인하세요.' : '메시지를 전송했습니다. 온체인 확인 대기 중입니다.'}</p><a className="block break-all underline" href={`https://tonviewer.com/transaction/${staking.submitted.hash}`} target="_blank" rel="noreferrer">메시지·거래 확인</a></div>}
  </div>;
}
