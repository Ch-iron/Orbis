'use client';
import { useState } from 'react';
import { formatEther, getAddress } from 'viem';
import { Button } from '@/components/ui/button';
import { WalletSelectDialog } from '@/components/layout/WalletSelectDialog';
import { useVechainStaking } from './useVechainStaking';
export function VechainStakingView() {
  const staking = useVechainStaking();
  const [open, setOpen] = useState(false);
  const [levelId, setLevelId] = useState('');
  const [validator, setValidator] = useState('');
  const ready = !!staking.owner && !staking.pending;
  const errors = [staking.levels.error, staking.validators.error, staking.positions.error, staking.balance.error, staking.block.error, staking.receipt.error].filter(Boolean);
  return <div className="space-y-6"><h1 className="text-2xl font-bold">VeChain StarGate 스테이킹</h1>
    <WalletSelectDialog open={open} onOpenChange={setOpen} />{!staking.owner && <Button onClick={() => setOpen(true)}>VeChain 지갑 연결</Button>}
    <p className="text-sm text-muted-foreground">VET를 예치하면 소유권을 나타내는 NFT를 받습니다. 준비 기간이 지난 NFT를 검증자에게 위임하면 VTHO 보상을 받습니다. 거래 수수료도 VTHO로 지불합니다.</p><p>잔액: {staking.balance.data ? `${formatEther(staking.balance.data.vet)} VET · ${formatEther(staking.balance.data.vtho)} VTHO` : '조회 전'}</p>
    {errors.map((error, index) => <p key={index} role="alert" className="text-destructive">{error?.message}</p>)}
    <section className="rounded-xl border p-4 space-y-4"><h2 className="font-semibold">VET 예치·NFT 발급</h2>{staking.levels.isPending && <p>레벨 조회 중</p>}<select className="w-full rounded border bg-background p-2" aria-label="VeChain 예치 레벨" value={levelId} onChange={(event) => setLevelId(event.target.value)}><option value="">레벨 선택</option>{staking.levels.data?.map((level) => <option key={level.id} value={level.id} disabled={level.supply >= BigInt(level.cap)}>{level.name} · {formatEther(level.vetAmountRequiredToStake)} VET · 준비 {level.maturityBlocks.toString()}블록 · {level.supply.toString()}/{level.cap}</option>)}</select><Button disabled={!ready || !levelId} onClick={() => staking.execute({ kind: 'stake', levelId: Number(levelId) })}>VET 예치하고 NFT 발급</Button></section>
    <section className="rounded-xl border p-4 space-y-4"><h2 className="font-semibold">검증자 선택</h2>{staking.validators.isPending && <p>메인넷 검증자와 위임 조건 조회 중</p>}<select className="w-full rounded border bg-background p-2" aria-label="VeChain 검증자" value={validator} onChange={(event) => setValidator(event.target.value)}><option value="">검증자 선택</option>{staking.validators.data?.filter((item) => [1, 2].includes(item.status) && item.exitBlock === 4294967295).map((item) => <option key={item.address} value={item.address}>{item.address} · {item.status === 2 ? '활성' : '대기'} · 기간 {item.period}블록</option>)}</select><p className="text-xs text-muted-foreground">VTHO 보상은 검증자 성과와 NFT 레벨에 따라 달라집니다. VET 수량 대비 수익률로 환산한 APY는 제공하지 않습니다.</p></section>
    {staking.owner && <section className="rounded-xl border p-4 space-y-4"><h2 className="font-semibold">내 StarGate NFT</h2>{staking.positions.isPending && <p>조회 중</p>}{staking.positions.data?.length === 0 && <p>보유한 StarGate NFT가 없습니다.</p>}{staking.positions.data?.map((position) => {
      const mature = staking.block.data && BigInt(staking.block.data.number) >= position.maturity;
      const status = position.delegation.status;
      return <div key={position.tokenId.toString()} className="border-b pb-3 space-y-2"><p>#{position.tokenId.toString()} · {formatEther(position.vetAmountStaked)} VET · 레벨 {position.levelId}</p><p>준비 완료 블록 {position.maturity.toString()} · {mature ? '준비 완료' : '준비 중'}</p><p>{['미위임', '위임 시작 대기', '위임 중', '위임 종료'][status]}{position.requestedExit && status === 2 ? ' · 종료 요청 처리 대기' : ''}</p><p className="break-all">검증자: {position.delegation.validator}</p><p>수령 가능 {formatEther(position.rewards)} VTHO · 현재 기간 보상 {formatEther(position.lockedRewards)} VTHO</p><div className="flex flex-wrap gap-2"><Button disabled={!ready || !mature || status === 2 || !validator} onClick={() => staking.execute({ kind: 'delegate', tokenId: position.tokenId, validator: getAddress(validator) })}>선택 검증자에게 위임</Button><Button variant="outline" disabled={!ready || ![1, 2].includes(status) || position.requestedExit} onClick={() => staking.execute({ kind: 'exit', tokenId: position.tokenId })}>위임 종료 요청</Button><Button variant="outline" disabled={!ready || position.rewards === BigInt(0)} onClick={() => staking.execute({ kind: 'claim', tokenId: position.tokenId })}>VTHO 보상 수령</Button><Button variant="outline" disabled={!ready || !mature || status === 2} onClick={() => staking.execute({ kind: 'unstake', tokenId: position.tokenId })}>NFT 소각·VET 출금</Button></div></div>;
    })}</section>}
    {staking.pending && <p role="status">시뮬레이션과 지갑 승인을 기다리고 있습니다.</p>}{staking.error && <p role="alert" className="text-destructive">{staking.error}</p>}{staking.hash && <a className="block break-all underline" href={`https://explore.vechain.org/transactions/${staking.hash}`} target="_blank" rel="noreferrer">{staking.receipt.data === 'success' ? '확인된 거래' : staking.receipt.data === 'failed' ? '실패한 거래' : '전송됨·온체인 확인 대기'}</a>}
  </div>;
}
