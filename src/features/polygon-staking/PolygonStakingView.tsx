'use client';
import { useState } from 'react';
import { formatEther } from 'viem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WalletSelectDialog } from '@/components/layout/WalletSelectDialog';
import { usePolygonStaking } from './usePolygonStaking';
export function PolygonStakingView() {
  const staking = usePolygonStaking();
  const [id, setId] = useState('');
  const [amount, setAmount] = useState('');
  const [open, setOpen] = useState(false);
  const ready = staking.connected && staking.correctNetwork && !staking.pending;
  const errors = [staking.validators.error, staking.positions.error, staking.withdrawals.error, staking.balance.error, staking.gasBalance.error].filter(Boolean);
  return <div className="space-y-6"><h1 className="text-2xl font-bold">Polygon POL 스테이킹</h1><p className="text-sm text-muted-foreground">Polygon 검증자 위임은 Ethereum 메인넷에서 실행됩니다. Ethereum에 보유한 POL과 가스비 ETH가 필요합니다. 해제 후 출금은 체크포인트 진행 상황에 따라 결정됩니다.</p>
    <WalletSelectDialog open={open} onOpenChange={setOpen} />{(!staking.connected || !staking.correctNetwork) && <Button onClick={() => setOpen(true)}>Ethereum 지갑 연결·네트워크 변경</Button>}<p>POL: {staking.balance.data !== undefined ? formatEther(staking.balance.data) : '조회 전'} · 가스비 ETH: {staking.gasBalance.data !== undefined ? formatEther(staking.gasBalance.data) : '조회 전'}</p>
    {errors.map((error, index) => <p key={index} role="alert" className="text-destructive">{error?.message}</p>)}
    <section className="rounded-xl border p-4 space-y-4"><h2 className="font-semibold">검증자 선택</h2>{staking.validators.isPending && <p>조회 중</p>}<select className="w-full rounded border bg-background p-2" aria-label="Polygon 검증자" value={id} onChange={(event) => setId(event.target.value)}><option value="">검증자 선택</option>{staking.validators.data?.filter((item) => item.status === 'active' && item.isDelegationEnabled).map((item) => <option key={item.id} value={item.id}>{item.name} · 수수료 {item.commissionPercentage}%</option>)}</select><p className="text-xs text-muted-foreground">검증자별 연 수익률은 현재 조회되지 않습니다.</p>
      <Input aria-label="POL 수량" placeholder="POL 수량" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} /><Button disabled={!ready || !id || !amount} onClick={() => staking.execute({ kind: 'stake', id: BigInt(id), amount })}>예치</Button>
    </section>
    {staking.connected && <section className="rounded-xl border p-4 space-y-4"><h2 className="font-semibold">내 예치</h2><p className="text-sm">해제할 수량은 위 수량 입력란에 입력하세요.</p>{staking.positions.isPending && <p>조회 중</p>}{staking.positions.data?.length === 0 && <p>예치 내역이 없습니다.</p>}{staking.positions.data?.map((position) => <div key={position.id.toString()} className="border-b pb-3 space-y-2"><p>{staking.validators.data?.find((item) => BigInt(item.id) === position.id)?.name ?? `검증자 ${position.id}`}</p><p>예치 {formatEther(position.amount)} · 보상 {formatEther(position.rewards)} POL</p><div className="flex flex-wrap gap-2"><Button variant="outline" disabled={!ready || !amount || position.amount === BigInt(0)} onClick={() => staking.execute({ kind: 'unstake', id: position.id, amount })}>해제 요청</Button>{([{ kind: 'claim', label: '보상 수령' }, { kind: 'compound', label: '보상 재예치' }] as const).map((action) => <Button variant="outline" key={action.kind} disabled={!ready || position.rewards === BigInt(0)} onClick={() => staking.execute({ kind: action.kind, id: position.id })}>{action.label}</Button>)}</div></div>)}</section>}
    {staking.connected && <section className="rounded-xl border p-4 space-y-4"><h2 className="font-semibold">해제 내역</h2>{staking.withdrawals.isPending && <p>조회 중</p>}{staking.withdrawals.data?.map((item) => <div key={`${item.id}-${item.nonce}`} className="space-y-2"><p>검증자 {item.id.toString()} · {formatEther(item.amount)} POL · 체크포인트 {item.epoch.toString()} / {item.claimEpoch.toString()}</p><Button variant="outline" disabled={!ready || !item.ready} onClick={() => staking.execute({ kind: 'withdraw', id: item.id, nonce: item.nonce })}>출금</Button></div>)}</section>}
    {staking.pending && <p role="status">지갑 승인·거래 확인을 기다리고 있습니다.</p>}{staking.error && <p role="alert" className="text-destructive">{staking.error}</p>}{staking.hash && <a className="block break-all underline" href={`https://etherscan.io/tx/${staking.hash}`} target="_blank" rel="noreferrer">{staking.confirmed ? '확인된 거래' : '전송한 거래'}: {staking.hash}</a>}
  </div>;
}
