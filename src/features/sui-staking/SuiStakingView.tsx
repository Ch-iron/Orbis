'use client';

import { useState } from 'react';
import { formatUnits } from 'viem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WalletSelectDialog } from '@/components/layout/WalletSelectDialog';
import { useSuiStaking, useSuiValidatorYield } from './useSuiStaking';

const tokens = (amount: bigint | string) => formatUnits(BigInt(amount), 9);

export function SuiStakingView() {
  const staking = useSuiStaking();
  const [open, setOpen] = useState(false);
  const [validator, setValidator] = useState('');
  const [amount, setAmount] = useState('');
  const selected = staking.validators.data?.find((item) => item.address === validator);
  const errors = [staking.validators.error, staking.positions.error, staking.balance.error].filter(Boolean);
  return <div className="space-y-6">
    <h1 className="text-2xl font-bold">Sui 스테이킹</h1>
    <p className="text-sm text-muted-foreground">출금 시 선택한 예치 객체의 원금과 누적 보상을 함께 받습니다.</p>
    <WalletSelectDialog open={open} onOpenChange={setOpen} />
    {!staking.owner && <Button onClick={() => setOpen(true)}>Sui 지갑 연결</Button>}
    <p>지갑 잔액: {staking.balance.data ? `${tokens(staking.balance.data.balance.balance)} SUI` : '조회 전'}</p>
    {errors.map((error, index) => <p key={index} role="alert" className="text-destructive">{error?.message}</p>)}
    <section className="rounded-xl border p-4 space-y-4"><h2 className="font-semibold">검증자 선택</h2>{staking.validators.isPending && <p>조회 중</p>}
      <div className="max-h-80 overflow-auto"><table className="w-full text-sm"><thead><tr><th className="text-left">검증자</th><th>수수료</th><th>선택</th></tr></thead><tbody>{staking.validators.data?.map((item) => <tr key={item.address} className="border-t"><td className="py-3">{item.name}</td><td className="text-center">{(item.commission * 100).toFixed(2)}%</td><td className="text-center"><Button size="sm" variant={validator === item.address ? 'default' : 'outline'} onClick={() => setValidator(item.address)}>선택</Button></td></tr>)}</tbody></table></div>
      {selected && <div><p>{selected.name}</p>{selected.activationEpoch !== undefined && <ValidatorYield tableId={selected.exchangeRatesId} activationEpoch={selected.activationEpoch} />}</div>}
      <Input aria-label="예치 SUI" placeholder="SUI 수량" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} />
      <Button disabled={!staking.owner || !validator || !amount || staking.pending} onClick={() => staking.execute({ kind: 'stake', validator, amount })}>예치</Button>
    </section>
    {staking.owner && <section className="rounded-xl border p-4 space-y-4"><h2 className="font-semibold">내 예치</h2>{staking.positions.isPending && <p>조회 중</p>}{staking.positions.data?.length === 0 && <p>예치 내역이 없습니다.</p>}{staking.positions.data?.map((position) => <div key={position.objectId} className="border-b pb-3 space-y-2"><p>{position.validatorName}</p><p>{tokens(position.principal)} SUI · 예상 보상 {position.rewards === null ? '조회 불가' : `${tokens(position.rewards)} SUI`}</p><p className="text-sm">{position.pending ? `활성화 대기 · 에포크 ${position.activationEpoch}` : '활성화된 예치'}</p><Button variant="outline" disabled={staking.pending} onClick={() => staking.execute({ kind: 'withdraw', objectId: position.objectId })}>원금과 보상 출금</Button></div>)}</section>}
    {staking.pending && <p role="status">시뮬레이션·지갑 승인·거래 확인을 기다리고 있습니다.</p>}{staking.error && <p role="alert" className="text-destructive">{staking.error}</p>}{staking.digest && <a className="block break-all underline" href={`https://suiscan.xyz/mainnet/tx/${staking.digest}`} target="_blank" rel="noreferrer">{staking.confirmed ? '확인된 거래' : '전송한 거래'}: {staking.digest}</a>}
  </div>;
}

function ValidatorYield({ tableId, activationEpoch }: { tableId: string; activationEpoch: bigint }) {
  const query = useSuiValidatorYield(tableId, activationEpoch);
  return <div><p>추정 APY: {query.data !== undefined ? `${(query.data * 100).toFixed(2)}%` : query.error ? '조회 불가' : '조회 중'}</p><p className="text-xs text-muted-foreground">최근 최대 30에포크의 풀 환산율 변화를 연 복리로 환산했습니다. 과거 성과이며 앞으로의 수익을 보장하지 않습니다.</p></div>;
}
