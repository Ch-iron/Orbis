'use client';
import { useState } from 'react';
import { formatUnits } from 'viem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WalletSelectDialog } from '@/components/layout/WalletSelectDialog';
import { useMultiversxStaking } from './useMultiversxStaking';
const tokens = (amount: bigint | string) => formatUnits(BigInt(amount), 18);
export function MultiversxStakingView() {
  const staking = useMultiversxStaking();
  const [pool, setPool] = useState('');
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const errors = [staking.validators.error, staking.positions.error, staking.balance.error].filter(Boolean);
  return <div className="space-y-6"><h1 className="text-2xl font-bold">MultiversX 스테이킹</h1><p className="text-sm text-muted-foreground">해제 요청 후 출금 가능 금액은 위임 계약에서 확인합니다. 보상은 별도로 수령하거나 재예치할 수 있습니다.</p>
    <WalletSelectDialog open={open} onOpenChange={setOpen} />{!staking.owner && <Button onClick={() => setOpen(true)}>MultiversX 지갑 연결</Button>}<p>지갑 잔액: {staking.balance.data !== undefined ? `${tokens(staking.balance.data)} EGLD` : '조회 전'}</p>
    {errors.map((error, index) => <p key={index} role="alert" className="text-destructive">{error?.message}</p>)}
    <section className="rounded-xl border p-4 space-y-4"><h2 className="font-semibold">위임 제공자 선택</h2>{staking.validators.isPending && <p>조회 중</p>}<select className="w-full rounded border bg-background p-2" aria-label="MultiversX 위임 제공자" value={pool} onChange={(event) => setPool(event.target.value)}><option value="">제공자 선택</option>{staking.validators.data?.filter((item) => item.numNodes > 0).map((item) => <option key={item.provider} value={item.provider}>{item.identity ?? item.provider} · 수수료 {(item.serviceFee * 100).toFixed(2)}% · APR {item.apr !== undefined ? `${item.apr.toFixed(2)}%` : '조회 불가'}</option>)}</select><p className="text-xs text-muted-foreground">APR(연 단리 수익률)은 MultiversX 공식 API가 제공하는 제공자별 추정치입니다.</p>
      <Input aria-label="EGLD 수량" placeholder="EGLD 수량" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} /><Button disabled={!staking.owner || !pool || !amount || staking.pending} onClick={() => staking.execute({ kind: 'delegate', contract: pool, amount })}>예치</Button>
    </section>
    {staking.owner && <section className="rounded-xl border p-4 space-y-4"><h2 className="font-semibold">내 예치</h2><p className="text-sm">해제할 수량은 위 수량 입력란에 입력하세요.</p>{staking.positions.isPending && <p>조회 중</p>}{staking.positions.data?.length === 0 && <p>예치 내역이 없습니다.</p>}{staking.positions.data?.map((position) => <div key={position.contract} className="border-b pb-3 space-y-2"><p className="break-all">{staking.validators.data?.find((item) => item.provider === position.contract)?.identity ?? position.contract}</p><p>예치 {tokens(position.active)} · 미출금 해제액 {tokens(position.unstaked)} · 출금 가능 {tokens(position.withdrawable)} EGLD</p><p>보상 {tokens(position.rewards)} EGLD</p><div className="flex flex-wrap gap-2"><Button variant="outline" disabled={staking.pending || !amount || position.active === BigInt(0)} onClick={() => staking.execute({ kind: 'undelegate', contract: position.contract, amount })}>해제 요청</Button><Button variant="outline" disabled={staking.pending || position.withdrawable === BigInt(0)} onClick={() => staking.execute({ kind: 'withdraw', contract: position.contract })}>출금</Button>{([{ kind: 'claim', label: '보상 수령' }, { kind: 'compound', label: '보상 재예치' }] as const).map((action) => <Button variant="outline" key={action.kind} disabled={staking.pending || position.rewards === BigInt(0)} onClick={() => staking.execute({ kind: action.kind, contract: position.contract })}>{action.label}</Button>)}</div></div>)}</section>}
    {staking.pending && <p role="status">시뮬레이션·지갑 승인·거래 확인을 기다리고 있습니다.</p>}{staking.error && <p role="alert" className="text-destructive">{staking.error}</p>}{staking.hash && <a className="block break-all underline" href={`https://explorer.multiversx.com/transactions/${staking.hash}`} target="_blank" rel="noreferrer">{staking.confirmed ? '확인된 거래' : '전송한 거래'}: {staking.hash}</a>}
  </div>;
}
