'use client';

import { useState } from 'react';
import { formatUnits } from 'viem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WalletSelectDialog } from '@/components/layout/WalletSelectDialog';
import { useRetiStaking, useRetiPoolYield } from './useRetiStaking';

const algo = (value: bigint) => formatUnits(value, 6);

export function RetiStakingView() {
  const staking = useRetiStaking();
  const [walletOpen, setWalletOpen] = useState(false);
  const [selected, setSelected] = useState('');
  const [amount, setAmount] = useState('');
  const [withdrawPool, setWithdrawPool] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [search, setSearch] = useState('');
  const validator = staking.validators.data?.find((item) => item.id.toString() === selected);
  const errors = [staking.validators.error, staking.account.error, staking.positions.error, staking.registration.error].filter(Boolean);
  const visible = staking.validators.data?.filter((item) => `${item.id} ${item.owner}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="space-y-6">
    <div><h1 className="text-2xl font-bold">Algorand · Réti</h1><p className="text-sm text-muted-foreground">검증자를 선택해 ALGO를 예치합니다. ALGO 보상은 예치 잔액에 합산됩니다.</p></div>
    {!staking.owner && <Button onClick={() => setWalletOpen(true)}>Algorand 지갑 연결</Button>}
    <WalletSelectDialog open={walletOpen} onOpenChange={setWalletOpen} />
    {errors.map((error, i) => <p key={i} role="alert" className="text-destructive">조회 실패: {error?.message}</p>)}
    {staking.owner && <div className="rounded-xl border p-4 space-y-2">
      <p className="break-all text-sm">{staking.owner}</p>
      <p>지갑 잔액: {staking.account.data ? `${algo(staking.account.data.amount)} ALGO` : '조회 중'}</p>
      <p>계정 유지에 필요한 잔액: {staking.account.data ? `${algo(staking.account.data.minimumBalance)} ALGO` : '조회 중'}</p>
      <p>Réti 등록 비용: {staking.registration.data !== undefined ? `${algo(staking.registration.data)} ALGO` : '조회 중'}</p>
    </div>}
    <section className="rounded-xl border p-4 space-y-4">
      <h2 className="text-lg font-semibold">검증자 선택</h2>
      <Input aria-label="검증자 검색" placeholder="검증자 번호 또는 운영자 주소 검색" value={search} onChange={(event) => setSearch(event.target.value)} />
      {staking.validators.isPending && <p>검증자 조회 중</p>}
      <div className="max-h-80 overflow-auto"><table className="w-full text-sm"><thead><tr><th className="text-left">검증자</th><th>수수료</th><th>최소 예치</th><th>선택</th></tr></thead><tbody>
        {visible?.map((item) => <tr key={item.id.toString()} className="border-t"><td className="py-3"><a href={`https://reti.nodely.io/validators/${item.id}`} target="_blank" rel="noreferrer">#{item.id.toString()}</a><div className="text-xs text-muted-foreground">{item.owner.slice(0, 8)}…{item.owner.slice(-6)}{item.gatingType !== 0 && ' · 자산 보유 조건 있음'}</div></td><td className="text-center">{(item.commission * 100).toFixed(2)}%</td><td className="text-center">{algo(item.minimum)} ALGO</td><td className="text-center"><Button size="sm" variant={selected === item.id.toString() ? 'default' : 'outline'} onClick={() => setSelected(item.id.toString())}>선택</Button></td></tr>)}
      </tbody></table></div>
      {visible?.length === 0 && <p>검색 결과가 없습니다.</p>}
      {validator && <div className="space-y-3"><h3>검증자 #{selected}의 풀</h3>
        {validator.pools.map((pool) => <PoolYield key={pool.appId.toString()} appId={pool.appId} balance={pool.balance} />)}
        <p className="text-xs text-muted-foreground">APY(연 복리 수익률)는 Réti가 사용하는 Nodely의 풀 지표입니다. 실제 예치 풀은 계약이 배정합니다.</p>
        {validator.gatingType !== 0 && <p>이 검증자는 별도 자산 보유 조건이 있습니다. 예치는 Réti 공식 앱에서 진행하세요.</p>}
        <Input aria-label="예치 ALGO" placeholder="예치할 ALGO" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} />
        <p className="text-xs text-muted-foreground">최초 예치에는 위 등록 비용과 거래 수수료가 추가됩니다. 보너스 토큰 등록이 필요한 경우 0.1 ALGO가 계정 유지 잔액으로 추가됩니다.</p>
        <Button disabled={!staking.owner || staking.pending || validator.gatingType !== 0 || !amount} onClick={() => staking.execute({ kind: 'deposit', validatorId: validator.id, amount })}>예치</Button>
      </div>}
    </section>
    {staking.owner && <section className="rounded-xl border p-4 space-y-4">
      <h2 className="text-lg font-semibold">내 예치 및 출금</h2>
      {staking.positions.isPending && <p>예치 내역 조회 중</p>}
      {staking.positions.data?.length === 0 && <p>Réti 예치 내역이 없습니다.</p>}
      {staking.positions.data?.map((position) => <div key={position.poolAppId.toString()} className="border-b pb-3 space-y-1"><p>검증자 #{position.validatorId.toString()} · 풀 {position.poolAppId.toString()}</p><p>{algo(position.balance)} ALGO</p><p className="text-sm text-muted-foreground">누적 ALGO 보상: {algo(position.totalRewarded)}</p>{position.rewardTokenBalance > BigInt(0) && <p className="text-sm">보너스 토큰 보상도 있습니다. 출금 시 함께 수령합니다.</p>}<Button size="sm" variant="outline" onClick={() => { setWithdrawPool(position.poolAppId.toString()); setWithdrawAmount(algo(position.balance)); }}>전액 출금 금액 입력</Button></div>)}
      {withdrawPool && <><p>출금할 풀: {withdrawPool}</p><Input aria-label="출금 ALGO" inputMode="decimal" value={withdrawAmount} onChange={(event) => setWithdrawAmount(event.target.value)} /><Button disabled={staking.pending || !withdrawAmount} onClick={() => staking.execute({ kind: 'withdraw', poolAppId: BigInt(withdrawPool), amount: withdrawAmount })}>출금</Button></>}
    </section>}
    {staking.pending && <p role="status">거래 검증 및 지갑 승인, 확인을 기다리고 있습니다.</p>}
    {staking.error && <p role="alert" className="text-destructive">{staking.error}</p>}
    {staking.txIds.length > 0 && <div><p>거래 확인 완료</p>{staking.txIds.map((id) => <a className="block break-all text-sm underline" key={id} href={`https://allo.info/tx/${id}`} target="_blank" rel="noreferrer">{id}</a>)}</div>}
  </div>;
}

function PoolYield({ appId, balance }: { appId: bigint; balance: bigint }) {
  const query = useRetiPoolYield(appId);
  return <div className="text-sm">풀 {appId.toString()} · {algo(balance)} ALGO · APY {query.error ? '조회 불가' : query.data !== undefined ? `${(query.data * 100).toFixed(2)}%` : '조회 중'}</div>;
}
