'use client';
import { useState } from 'react';
import { formatUnits } from 'viem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WalletSelectDialog } from '@/components/layout/WalletSelectDialog';
import { useNearStaking } from './useNearStaking';
const tokens = (amount: bigint | string) => formatUnits(BigInt(amount), 24);
export function NearStakingView() {
  const [pool, setPool] = useState('');
  const staking = useNearStaking(pool);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const errors = [staking.validators.error, staking.positions.error, staking.balance.error, staking.apr.error, staking.poolInfo.error].filter(Boolean);
  return <div className="space-y-6"><h1 className="text-2xl font-bold">NEAR 스테이킹</h1><p className="text-sm text-muted-foreground">보상은 예치 잔액에 합산됩니다. 해제 요청 후 통상 4에포크를 기다리며, 출금 가능 여부는 풀 계약에서 확인합니다.</p>
    <WalletSelectDialog open={open} onOpenChange={setOpen} />{!staking.owner && <Button onClick={() => setOpen(true)}>NEAR 지갑 연결</Button>}
    <p>스토리지 예치금을 제외한 잔액: {staking.balance.data !== undefined ? `${tokens(staking.balance.data)} NEAR` : '조회 전'}</p>
    {errors.map((error, index) => <p key={index} role="alert" className="text-destructive">{error?.message}</p>)}
    <section className="rounded-xl border p-4 space-y-4"><h2 className="font-semibold">검증자 풀 선택</h2>{staking.validators.isPending && <p>조회 중</p>}<select className="w-full rounded border bg-background p-2" aria-label="NEAR 검증자" value={pool} onChange={(event) => setPool(event.target.value)}><option value="">풀 선택</option>{staking.validators.data?.filter((item) => !item.is_slashed).map((item) => <option key={item.account_id} value={item.account_id}>{item.account_id}</option>)}</select>
      {staking.poolInfo.data && <p>수수료 {(staking.poolInfo.data.commission * 100).toFixed(2)}% · 예상 APR {staking.apr.data !== undefined ? `${(staking.apr.data * (1 - staking.poolInfo.data.commission) * 100).toFixed(2)}%` : '조회 불가'}{staking.poolInfo.data.paused && ' · 예치 중지'}</p>}
      <p className="text-xs text-muted-foreground">APR(연 단리 수익률)은 현재 최대 발행률·총 예치량·풀 수수료로 계산합니다. 검증자 성과에 따라 실제 보상은 달라집니다. 선택한 검증자의 풀 설정을 조회하지 못하면 예치할 수 없습니다.</p>
      <Input aria-label="NEAR 수량" placeholder="NEAR 수량" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} /><Button disabled={!staking.owner || !pool || !amount || staking.pending || !staking.poolInfo.data || staking.poolInfo.data.paused} onClick={() => staking.execute({ kind: 'stake', pool, amount })}>예치</Button>
    </section>
    {staking.owner && <section className="rounded-xl border p-4 space-y-4"><h2 className="font-semibold">내 예치</h2><p className="text-sm">위 수량 입력란에 작업할 수량을 입력하세요.</p>{staking.positions.isPending && <p>조회 중</p>}{staking.positions.data?.length === 0 && <p>예치 내역이 없습니다.</p>}{staking.positions.data?.map((position) => <div key={position.pool} className="border-b pb-3 space-y-2"><p>{position.pool}</p><p>예치 {tokens(position.staked)} · {position.canWithdraw ? '출금 가능' : '해제 대기'} {tokens(position.unstaked)} NEAR</p><div className="flex gap-2"><Button variant="outline" disabled={staking.pending || !amount || position.staked === BigInt(0)} onClick={() => staking.execute({ kind: 'unstake', pool: position.pool, amount })}>해제 요청</Button><Button variant="outline" disabled={staking.pending || !amount || !position.canWithdraw || position.unstaked === BigInt(0)} onClick={() => staking.execute({ kind: 'withdraw', pool: position.pool, amount })}>출금</Button></div></div>)}</section>}
    {staking.pending && <p role="status">지갑 승인·거래 확인을 기다리고 있습니다.</p>}{staking.error && <p role="alert" className="text-destructive">{staking.error}</p>}{staking.hash && <a className="block break-all underline" href={`https://nearblocks.io/txns/${staking.hash}`} target="_blank" rel="noreferrer">{staking.confirmed ? '확인된 거래' : '전송한 거래'}: {staking.hash}</a>}
  </div>;
}
