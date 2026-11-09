'use client';
import { useState } from 'react';
import { formatEther, parseEther } from 'viem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WalletSelectDialog } from '@/components/layout/WalletSelectDialog';
import { iotexBucketState } from './state';
import { useIotexStaking } from './useIotexStaking';
export function IotexStakingView() {
  const staking = useIotexStaking();
  const [open, setOpen] = useState(false);
  const [candidate, setCandidate] = useState('');
  const [amount, setAmount] = useState('');
  const [days, setDays] = useState('7');
  const [autoStake, setAutoStake] = useState(false);
  const ready = staking.connected && staking.correctNetwork && !staking.pending;
  const errors = [staking.candidates.error, staking.balance.error, staking.buckets.error, staking.block.error].filter(Boolean);
  return <div className="space-y-6"><h1 className="text-2xl font-bold">IoTeX 네이티브 스테이킹</h1>
    <WalletSelectDialog open={open} onOpenChange={setOpen} />{(!staking.connected || !staking.correctNetwork) && <Button onClick={() => setOpen(true)}>IoTeX 지갑 연결</Button>}
    <p>잔액: {staking.balance.data !== undefined ? `${formatEther(staking.balance.data)} IOTX` : '조회 전'}</p>
    <p className="text-sm text-muted-foreground">예치별로 기간을 지정합니다. 자동 잠금을 끈 뒤 설정한 기간이 지나야 해제할 수 있고, 해제 후 출금까지 3일이 추가로 걸립니다. 이 화면은 네이티브 예치를 관리하며 NFT 형태의 예치는 포함하지 않습니다.</p>
    {errors.map((error, index) => <p key={index} role="alert" className="text-destructive">{error?.message}</p>)}
    <section className="rounded-xl border p-4 space-y-4"><h2 className="font-semibold">검증자에게 위임</h2>{staking.candidates.isPending && <p>검증자 조회 중</p>}
      <select className="w-full rounded border bg-background p-2" aria-label="IoTeX 검증자" value={candidate} onChange={(event) => setCandidate(event.target.value)}><option value="">검증자 선택</option>{staking.candidates.data?.filter((item) => item.selfStakingTokens >= parseEther('1200000')).map((item) => <option key={item.ownerAddress} value={item.name}>{item.name}</option>)}</select>
      <p className="text-xs text-muted-foreground">검증자별 수익률과 보상 배분 조건을 확인할 수 있는 데이터는 아직 제공하지 않습니다. 추정 수익률을 임의로 표시하지 않습니다. 지급된 보상은 지갑 잔액에서 확인하세요.</p>
      <Input aria-label="IOTX 예치 수량" placeholder="최소 100 IOTX" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} />
      <label className="block">예치 기간(일)<Input aria-label="IoTeX 예치 기간" type="number" min={0} max={1050} value={days} onChange={(event) => setDays(event.target.value)} /></label>
      <label className="flex gap-2"><input type="checkbox" checked={autoStake} onChange={(event) => setAutoStake(event.target.checked)} />자동 잠금 (켜져 있는 동안 기간이 줄어들지 않습니다)</label>
      <Button disabled={!ready || !candidate || !amount || !days} onClick={() => staking.execute({ kind: 'stake', candidate, amount, days: Number(days), autoStake })}>위임하기</Button>
    </section>
    {staking.connected && <section className="rounded-xl border p-4 space-y-4"><h2 className="font-semibold">내 네이티브 예치</h2>{staking.buckets.isPending && <p>조회 중</p>}{staking.buckets.data?.length === 0 && <p>예치 내역이 없습니다.</p>}{staking.buckets.data?.map((bucket) => {
      const state = staking.block.data ? iotexBucketState(bucket, staking.block.data.timestamp) : null;
      const name = staking.candidates.data?.find((item) => item.ownerAddress.toLowerCase() === bucket.candidateAddress.toLowerCase())?.name ?? bucket.candidateAddress;
      return <div key={bucket.index.toString()} className="border-b pb-3 space-y-2"><p className="break-all">#{bucket.index.toString()} · {name} · {formatEther(bucket.stakedAmount)} IOTX</p><p>{bucket.stakedDuration}일 · {bucket.autoStake ? '자동 잠금 켜짐' : state?.unstaked ? `출금 가능 시각 ${new Date(Number(state.withdrawAt) * 1000).toLocaleString()}` : state ? `해제 가능 시각 ${new Date(Number(state.maturity) * 1000).toLocaleString()}` : '상태 조회 중'}</p><div className="flex flex-wrap gap-2"><Button variant="outline" disabled={!ready || !bucket.autoStake || !state || state.unstaked} onClick={() => staking.execute({ kind: 'unlock', index: bucket.index })}>자동 잠금 끄기</Button><Button variant="outline" disabled={!ready || !state?.canUnstake} onClick={() => staking.execute({ kind: 'unstake', index: bucket.index })}>스테이킹 해제</Button><Button disabled={!ready || !state?.canWithdraw} onClick={() => staking.execute({ kind: 'withdraw', index: bucket.index })}>출금</Button></div></div>;
    })}</section>}
    {staking.pending && <p role="status">지갑 승인과 거래 확인을 기다리고 있습니다.</p>}{staking.error && <p role="alert" className="text-destructive">{staking.error}</p>}{staking.hash && <a className="block break-all underline" href={`https://iotexscan.io/tx/${staking.hash}`} target="_blank" rel="noreferrer">{staking.confirmed ? '확인된 거래' : '전송한 거래'}</a>}
  </div>;
}
