'use client';
import { useState } from 'react';
import { formatUnits } from 'viem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WalletSelectDialog } from '@/components/layout/WalletSelectDialog';
import { useAptosStaking } from './useAptosStaking';
const tokens = (amount: bigint | string) => formatUnits(BigInt(amount), 8);
export function AptosStakingView() {
  const staking = useAptosStaking();
  const [open, setOpen] = useState(false);
  const [pool, setPool] = useState('');
  const [amount, setAmount] = useState('');
  const errors = [staking.validators.error, staking.positions.error, staking.balance.error, staking.apr.error].filter(Boolean);
  return <div className="space-y-6"><h1 className="text-2xl font-bold">Aptos 스테이킹</h1>
    <p className="text-sm text-muted-foreground">보상은 예치 잔액에 합산됩니다. 해제 요청 후 풀 잠금이 만료되면 출금할 수 있습니다. 최소 잔액 조건은 서명 전 계약 시뮬레이션으로 검사합니다.</p>
    <WalletSelectDialog open={open} onOpenChange={setOpen} />{!staking.owner && <Button onClick={() => setOpen(true)}>Aptos 지갑 연결</Button>}
    <p>지갑 잔액: {staking.balance.data !== undefined ? `${tokens(staking.balance.data)} APT` : '조회 전'}</p>
    {errors.map((error, index) => <p key={index} role="alert" className="text-destructive">{error?.message}</p>)}
    <section className="rounded-xl border p-4 space-y-4"><h2 className="font-semibold">위임 풀 선택</h2>{staking.validators.isPending && <p>조회 중</p>}
      <select className="w-full rounded border bg-background p-2" aria-label="Aptos 위임 풀" value={pool} onChange={(event) => setPool(event.target.value)}><option value="">풀 선택</option>{staking.validators.data?.filter((item) => item.status === 'active').map((item) => <option key={item.address} value={item.address}>{item.name} · 수수료 {(item.commission * 100).toFixed(2)}% · 예상 APR {staking.apr.data !== undefined ? `${(staking.apr.data * (1 - item.commission) * 100).toFixed(2)}%` : '조회 불가'}</option>)}</select>
      <p className="text-xs text-muted-foreground">APR(연 단리 수익률)은 현재 에포크 보상률·에포크 길이와 풀 수수료로 계산한 추정치입니다. 검증자 성과에 따라 실제 보상은 달라집니다.</p>
      <Input aria-label="APT 수량" placeholder="APT 수량" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} />
      <Button disabled={!staking.owner || !pool || !amount || staking.pending} onClick={() => staking.execute({ kind: 'add_stake', pool, amount })}>예치</Button>
    </section>
    {staking.owner && <section className="rounded-xl border p-4 space-y-4"><h2 className="font-semibold">내 예치</h2><p className="text-sm">위 수량 입력란에 작업할 수량을 입력하세요.</p>{staking.positions.isPending && <p>조회 중</p>}{staking.positions.data?.length === 0 && <p>예치 내역이 없습니다.</p>}{staking.positions.data?.map((position) => <div key={position.pool} className="border-b pb-3 space-y-2"><p className="break-all">{position.pool}</p><p>활성 {tokens(position.active)} · 해제 대기 {tokens(position.pending)} · 출금 가능 {tokens(position.inactive)} APT</p><p className="text-sm">현재 풀 잠금 만료: {position.unlockAt.toLocaleString()}</p><div className="flex flex-wrap gap-2">{([{ kind: 'unlock', label: '해제 요청', available: position.active }, { kind: 'reactivate_stake', label: '해제 취소', available: position.pending }, { kind: 'withdraw', label: '출금', available: position.inactive }] as const).map((action) => <Button key={action.kind} variant="outline" disabled={staking.pending || !amount || action.available === BigInt(0)} onClick={() => staking.execute({ kind: action.kind, pool: position.pool, amount })}>{action.label}</Button>)}</div></div>)}</section>}
    {staking.pending && <p role="status">시뮬레이션·지갑 승인·거래 확인을 기다리고 있습니다.</p>}{staking.error && <p role="alert" className="text-destructive">{staking.error}</p>}{staking.hash && <a className="block break-all underline" href={`https://explorer.aptoslabs.com/txn/${staking.hash}?network=mainnet`} target="_blank" rel="noreferrer">{staking.confirmed ? '확인된 거래' : '전송한 거래'}: {staking.hash}</a>}
  </div>;
}
