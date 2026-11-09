'use client';

import { useState } from 'react';
import { formatEther } from 'viem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WalletSelectDialog } from '@/components/layout/WalletSelectDialog';
import { useSonicStaking } from './useSonicStaking';

export function SonicStakingView() {
  const staking = useSonicStaking();
  const [open, setOpen] = useState(false);
  const [validatorId, setValidatorId] = useState('');
  const [amount, setAmount] = useState('');
  const [operation, setOperation] = useState<'delegate' | 'undelegate'>('delegate');
  const name = (id: bigint) => staking.names.data?.get(id.toString()) ?? `Validator #${id}`;
  const errors = [staking.validators.error, staking.balance.error, staking.positions.error, staking.withdrawals.error, staking.parameters.error].filter(Boolean);
  return <div className="space-y-6">
    <h1 className="text-2xl font-bold">Sonic 스테이킹</h1>
    <WalletSelectDialog open={open} onOpenChange={setOpen} />
    {(!staking.connected || !staking.correctNetwork) && <Button onClick={() => setOpen(true)}>Sonic 지갑 연결</Button>}
    <p>지갑 잔액: {staking.balance.data !== undefined ? `${formatEther(staking.balance.data)} S` : '조회 전'}</p>
    <p className="text-sm text-muted-foreground">해제 대기: {staking.parameters.data ? `${Number(staking.parameters.data.seconds) / 86400}일 및 ${staking.parameters.data.epochs} 에포크` : '조회 중'}. 두 조건을 모두 충족한 뒤 출금할 수 있습니다.</p>
    {errors.map((error, index) => <p key={index} role="alert" className="text-destructive">{error?.message}</p>)}
    <section className="rounded-xl border p-4 space-y-4">
      <h2 className="font-semibold">검증자</h2>
      {staking.validators.isPending && <p>검증자 조회 중</p>}
      <div className="max-h-80 overflow-auto"><table className="w-full text-sm"><thead><tr><th className="text-left">이름</th><th>수수료</th><th>추정 APR</th><th>선택</th></tr></thead><tbody>{staking.validators.data?.map((validator) => <tr key={validator.id.toString()} className="border-t"><td className="py-3">{name(validator.id)}{validator.status !== BigInt(0) && ' · 비활성'}</td><td className="text-center">{(validator.commission * 100).toFixed(2)}%</td><td className="text-center">{staking.apr.data !== undefined ? `${(staking.apr.data * (1 - validator.commission) * 100).toFixed(2)}%` : '조회 불가'}</td><td className="text-center"><Button size="sm" variant={validatorId === validator.id.toString() ? 'default' : 'outline'} onClick={() => setValidatorId(validator.id.toString())}>선택</Button></td></tr>)}</tbody></table></div>
      <p className="text-xs text-muted-foreground">APR(연 단리 수익률)은 공식 네트워크 수익률에서 현재 수수료를 차감한 추정치입니다. 검증자의 실제 운영 성과에 따라 달라집니다.</p>
      <div className="flex gap-2"><Button variant={operation === 'delegate' ? 'default' : 'outline'} onClick={() => setOperation('delegate')}>위임</Button><Button variant={operation === 'undelegate' ? 'default' : 'outline'} onClick={() => setOperation('undelegate')}>해제</Button></div>
      <p>선택한 검증자: {validatorId || '미선택'}</p><Input aria-label="S 수량" placeholder="S 수량" value={amount} onChange={(event) => setAmount(event.target.value)} />
      <Button disabled={!staking.connected || !staking.correctNetwork || staking.pending || !validatorId || !amount} onClick={() => staking.execute({ kind: operation, validatorId: BigInt(validatorId), amount, ...(operation === 'undelegate' ? { requestId: BigInt(`0x${crypto.randomUUID().replaceAll('-', '')}`) } : {}) })}>{operation === 'delegate' ? '위임하기' : '해제 요청'}</Button>
    </section>
    {staking.connected && <section className="rounded-xl border p-4 space-y-4"><h2 className="font-semibold">내 예치 및 보상</h2>{staking.positions.isPending && <p>조회 중</p>}{staking.positions.data?.filter((position) => position.amount > BigInt(0) || position.rewards > BigInt(0)).map((position) => <div key={position.id.toString()} className="border-b pb-3 space-y-2"><p>{name(position.id)} · {formatEther(position.amount)} S</p><p>보상: {formatEther(position.rewards)} S</p><div className="flex gap-2"><Button disabled={staking.pending || !staking.correctNetwork || position.rewards === BigInt(0)} onClick={() => staking.execute({ kind: 'claimRewards', validatorId: position.id })}>보상 수령</Button><Button variant="outline" disabled={staking.pending || !staking.correctNetwork || position.rewards === BigInt(0)} onClick={() => staking.execute({ kind: 'restakeRewards', validatorId: position.id })}>보상 재위임</Button></div></div>)}</section>}
    {staking.connected && <section className="rounded-xl border p-4 space-y-3"><h2 className="font-semibold">출금 요청</h2>{staking.withdrawals.isPending && <p>조회 중</p>}{staking.withdrawals.data?.length === 0 && <p>출금 요청이 없습니다.</p>}{staking.withdrawals.data?.map((request) => <div key={`${request.validatorId}-${request.requestId}`} className="space-y-2"><p>{name(request.validatorId)} · {formatEther(request.amount)} S</p><p className="text-sm">{new Date(Number(request.unlockTime) * 1000).toLocaleString()} 이후, 에포크 {request.unlockEpoch.toString()} 도달 시 출금</p><Button disabled={!request.ready || staking.pending || !staking.correctNetwork} onClick={() => staking.execute({ kind: 'withdraw', validatorId: request.validatorId, requestId: request.requestId })}>출금</Button></div>)}</section>}
    {staking.pending && <p role="status">지갑 승인과 거래 확인을 기다리고 있습니다.</p>}{staking.error && <p role="alert" className="text-destructive">{staking.error}</p>}{staking.hash && <a className="block break-all underline" href={`https://sonicscan.org/tx/${staking.hash}`} target="_blank" rel="noreferrer">{staking.confirmed ? '확인된 거래' : '전송한 거래'}: {staking.hash}</a>}
  </div>;
}
