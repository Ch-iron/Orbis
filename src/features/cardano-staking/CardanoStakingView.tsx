'use client';
import { useState } from 'react';
import { formatUnits } from 'viem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WalletSelectDialog } from '@/components/layout/WalletSelectDialog';
import { useCardanoStaking } from './useCardanoStaking';
const ada = (value: string | bigint) => formatUnits(BigInt(value), 6);
export function CardanoStakingView() {
  const [pool, setPool] = useState('');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [allowAbstain, setAllowAbstain] = useState(false);
  const staking = useCardanoStaking(pool);
  const ready = staking.connected && !staking.pending;
  const errors = [staking.pools.error, staking.account.error, staking.balance.error, staking.parameters.error, staking.history.error, staking.receipt.error].filter(Boolean);
  const account = staking.account.data;
  const choices = staking.pools.data?.filter((item) => item.pool_status === 'registered' && item.retiring_epoch === null && `${item.ticker ?? ''} ${item.pool_id_bech32}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="space-y-6"><h1 className="text-2xl font-bold">Cardano 스테이킹</h1>
    <WalletSelectDialog open={open} onOpenChange={setOpen} />{!staking.connected && <Button onClick={() => setOpen(true)}>Cardano 지갑 연결</Button>}
    <p className="text-sm text-muted-foreground">ADA는 지갑에 남아 자유롭게 사용할 수 있습니다. 선택한 스테이크 계정 전체를 한 풀에 위임하며, 별도로 예치 수량을 전송하지 않습니다. 위임 변경과 보상 반영에는 에포크 지연이 있습니다.</p>
    <p>지갑 잔액: {staking.balance.data !== undefined ? `${ada(staking.balance.data)} ADA` : '조회 전'}</p><p>최초 등록 보증금: {staking.parameters.data ? `${ada(BigInt(staking.parameters.data.keyDeposit))} ADA` : '조회 중'} + 거래 수수료</p>
    {errors.map((error, index) => <p key={index} role="alert" className="text-destructive">{error?.message}</p>)}
    <section className="rounded-xl border p-4 space-y-4"><h2 className="font-semibold">위임 풀 선택</h2><Input aria-label="Cardano 풀 검색" placeholder="풀 티커 또는 ID 검색" value={search} onChange={(event) => setSearch(event.target.value)} />{staking.pools.isPending && <p>풀 조회 중</p>}<select className="w-full rounded border bg-background p-2" aria-label="Cardano 풀" value={pool} onChange={(event) => setPool(event.target.value)}><option value="">풀 선택</option>{choices?.map((item) => <option key={item.pool_id_bech32} value={item.pool_id_bech32}>{item.ticker ?? item.pool_id_bech32} · 변동 수수료 {(item.margin * 100).toFixed(2)}% · 풀 고정비 {ada(item.fixed_cost)} ADA/에포크</option>)}</select>
      {staking.history.data?.[0] && <p>최근 보상 확정 에포크 {staking.history.data[0].epoch_no} 기준 APY: {staking.history.data[0].epoch_ros.toFixed(2)}%</p>}<p className="text-xs text-muted-foreground">APY(연 복리 수익률)는 Koios가 해당 에포크의 보상을 연율로 환산한 값입니다. 미래 수익을 보장하지 않으며, 고정비는 풀 전체 보상에서 차감합니다.</p><Button disabled={!ready || !pool} onClick={() => staking.execute({ kind: 'delegate', pool })}>이 풀에 계정 전체 위임</Button>
    </section>
    {staking.connected && <section className="rounded-xl border p-4 space-y-4"><h2 className="font-semibold">내 스테이크 계정</h2><p className="break-all">{staking.connection?.stakeAddress}</p>{staking.account.isPending && <p>조회 중</p>}{account === null && <p>아직 등록되지 않은 계정입니다.</p>}{account && <><p className="break-all">현재 풀: {account.delegated_pool ?? '미위임'}</p><p>계정 잔액(보상 포함): {ada(account.total_balance)} ADA · 수령 가능한 보상: {ada(account.rewards_available)} ADA</p><p className="text-xs text-muted-foreground">계정 잔액은 위 지갑 잔액과 겹칩니다. 두 금액을 합산하지 않습니다.</p>{!account.delegated_drep && BigInt(account.rewards_available) > BigInt(0) && <label className="flex gap-2"><input type="checkbox" checked={allowAbstain} onChange={(event) => setAllowAbstain(event.target.checked)} />보상 수령을 위해 거버넌스 투표를 ‘항상 기권’으로 등록하는 데 동의합니다. 다른 대표는 지갑에서 직접 선택할 수 있습니다.</label>}<div className="flex gap-2"><Button disabled={!ready || BigInt(account.rewards_available) === BigInt(0)} onClick={() => staking.execute({ kind: 'claim', allowAbstain })}>보상 수령</Button><Button variant="outline" disabled={!ready || account.status !== 'registered'} onClick={() => staking.execute({ kind: 'deregister', allowAbstain })}>보상 수령 후 위임 종료·보증금 반환</Button></div></>}</section>}
    {staking.pending && <p role="status">거래 생성과 지갑 승인을 기다리고 있습니다.</p>}{staking.error && <p role="alert" className="text-destructive">{staking.error}</p>}{staking.hash && <a className="block break-all underline" href={`https://cardanoscan.io/transaction/${staking.hash}`} target="_blank" rel="noreferrer">{staking.receipt.data === 'success' ? '확인된 거래' : staking.receipt.data === 'failed' ? '실패한 거래' : '전송됨·온체인 확인 대기'}: {staking.hash}</a>}
  </div>;
}
