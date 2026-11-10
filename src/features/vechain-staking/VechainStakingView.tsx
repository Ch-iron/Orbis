'use client';
import { useState } from 'react';
import { PoolStakingTabs } from '@/features/staking/PoolStakingTabs';
import { StakingTargetTable } from '@/features/staking/StakingTargetTable';
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
  const transactionFeedback = (<>{staking.pending && <p role="status">Waiting for simulation and wallet approval.</p>}{staking.error && <p role="alert" className="text-destructive">{staking.error}</p>}{staking.hash && <a className="block break-all underline" href={`https://explore.vechain.org/transactions/${staking.hash}`} target="_blank" rel="noreferrer">{staking.receipt.data === 'success' ? 'Confirmed transaction' : staking.receipt.data === 'failed' ? 'Failed transaction' : 'Submitted, awaiting on-chain confirmation'}</a>}</>);
  return <div className="space-y-6"><h1 className="text-2xl font-bold">Staking</h1>
    <WalletSelectDialog open={open} onOpenChange={setOpen} />{!staking.owner && <Button onClick={() => setOpen(true)}>Connect VeChain Wallet</Button>}
    <p className="text-sm text-muted-foreground">Staking VET mints an NFT representing ownership. After the preparation period, delegate the NFT to a validator to earn VTHO rewards. Transaction fees are also paid in VTHO.</p><p>Balance: {staking.balance.data ? `${formatEther(staking.balance.data.vet)} VET · ${formatEther(staking.balance.data.vtho)} VTHO` : 'Not loaded'}</p>
    {errors.map((error, index) => <p key={index} role="alert" className="text-destructive">{error?.message}</p>)}
    <PoolStakingTabs connected={!!staking.owner} pending={staking.pending}
      selection={<StakingTargetTable
        targets={(staking.levels.data ?? []).filter((level) => level.supply < BigInt(level.cap)).map((level) => ({ id: String(level.id), name: level.name, details: <>{formatEther(level.vetAmountRequiredToStake)} VET · Preparation {level.maturityBlocks.toString()} blocks · {level.supply.toString()}/{level.cap}</> }))}
        value={levelId} onSelect={setLevelId} loading={staking.levels.isPending} error={staking.levels.error} pending={staking.pending}>
        <p className="text-sm text-muted-foreground">Stake VET to mint a StarGate NFT, then delegate it from My Staking after the preparation period.</p>
        <Button disabled={!ready || !levelId} onClick={() => staking.execute({ kind: 'stake', levelId: Number(levelId) })}>Stake VET and Mint NFT</Button>
        {transactionFeedback}
      </StakingTargetTable>}
      positions={<><StakingTargetTable targets={(staking.validators.data ?? []).filter((item) => [1, 2].includes(item.status) && item.exitBlock === 4294967295).map((item) => ({ id: item.address, name: item.address, details: <>{item.status === 2 ? 'Active' : 'Pending'} · Duration {item.period} blocks</> }))} value={validator} onSelect={setValidator} loading={staking.validators.isPending} error={staking.validators.error} pending={staking.pending} />{staking.owner && <section className="rounded-xl border p-4 space-y-4"><h2 className="font-semibold">My StarGate NFTs</h2>{staking.positions.isPending && <p>Loading</p>}{staking.positions.data?.length === 0 && <p>No StarGate NFTs owned.</p>}{staking.positions.data?.map((position) => {
      const mature = staking.block.data && BigInt(staking.block.data.number) >= position.maturity;
      const status = position.delegation.status;
      return <div key={position.tokenId.toString()} className="border-b pb-3 space-y-2"><p>#{position.tokenId.toString()} · {formatEther(position.vetAmountStaked)}  VET · Level {position.levelId}</p><p>Ready at block {position.maturity.toString()} · {mature ? 'Ready' : 'Preparing'}</p><p>{['Not delegated', 'Awaiting delegation start', 'Delegating', 'Delegation ended'][status]}{position.requestedExit && status === 2 ? ' · Exit request pending' : ''}</p><p className="break-all">Validator: {position.delegation.validator}</p><p>Claimable {formatEther(position.rewards)}  VTHO · Current period rewards {formatEther(position.lockedRewards)} VTHO</p><div className="flex flex-wrap gap-2"><Button disabled={!ready || !mature || status === 2 || !validator} onClick={() => staking.execute({ kind: 'delegate', tokenId: position.tokenId, validator: getAddress(validator) })}>Delegate to Selected Validator</Button><Button variant="outline" disabled={!ready || ![1, 2].includes(status) || position.requestedExit} onClick={() => staking.execute({ kind: 'exit', tokenId: position.tokenId })}>Request Delegation Exit</Button><Button variant="outline" disabled={!ready || position.rewards === BigInt(0)} onClick={() => staking.execute({ kind: 'claim', tokenId: position.tokenId })}>Claim VTHO Rewards</Button><Button variant="outline" disabled={!ready || !mature || status === 2} onClick={() => staking.execute({ kind: 'unstake', tokenId: position.tokenId })}>Burn NFT and Withdraw VET</Button></div></div>;
    })}</section>}</>}
    />
    {transactionFeedback}
  </div>;
}
