'use client';
import { useState } from 'react';
import { PoolStakingTabs } from '@/features/staking/PoolStakingTabs';
import { StakingTargetTable } from '@/features/staking/StakingTargetTable';
import { formatUnits } from 'viem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WalletSelectDialog } from '@/components/layout/WalletSelectDialog';
import { useMultiversxStaking } from './useMultiversxStaking';
const tokens = (amount: bigint | string) => formatUnits(BigInt(amount), 18);
export function MultiversxStakingView() {
  const staking = useMultiversxStaking();
  const [pool, setPool] = useState('');
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const errors = [staking.validators.error, staking.positions.error, staking.balance.error].filter(Boolean);
  const transactionFeedback = (<>{staking.pending && <p role="status">Waiting for simulation, wallet approval, and transaction confirmation.</p>}{staking.error && <p role="alert" className="text-destructive">{staking.error}</p>}{staking.hash && <a className="block break-all underline" href={`https://explorer.multiversx.com/transactions/${staking.hash}`} target="_blank" rel="noreferrer">{staking.confirmed ? 'Confirmed transaction' : 'Submitted transaction'}: {staking.hash}</a>}</>);
  return <div className="space-y-6"><h1 className="text-2xl font-bold">Staking</h1><p className="text-sm text-muted-foreground">After requesting an unstake, the delegation contract determines the withdrawable amount. Rewards can be claimed separately or restaked.</p>
    <WalletSelectDialog open={open} onOpenChange={setOpen} />{!staking.owner && <Button onClick={() => setOpen(true)}>Connect MultiversX Wallet</Button>}<p>Wallet balance: {staking.balance.data !== undefined ? `${tokens(staking.balance.data)} EGLD` : 'Not loaded'}</p>
    {errors.map((error, index) => <p key={index} role="alert" className="text-destructive">{error?.message}</p>)}
    <PoolStakingTabs connected={!!staking.owner} pending={staking.pending}
      selection={<><StakingTargetTable targets={(staking.validators.data ?? []).filter((item) => item.numNodes > 0).map((item) => ({ id: item.provider, name: item.identity ?? item.provider, details: <>Commission {(item.serviceFee * 100).toFixed(2)}% · APR {item.apr !== undefined ? `${item.apr.toFixed(2)}%` : 'Unavailable'}</> }))} value={pool} onSelect={setPool} loading={staking.validators.isPending} error={staking.validators.error} pending={staking.pending}><p className="text-xs text-muted-foreground">The annual percentage rate (APR) is a provider-specific estimate from the official MultiversX API.</p>
      <Input aria-label="EGLD amount" placeholder="EGLD amount" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} /><Button disabled={!staking.owner || !pool || !amount || staking.pending} onClick={() => staking.execute({ kind: 'delegate', contract: pool, amount })}>Stake</Button>

      {transactionFeedback}
      </StakingTargetTable></>}
      positions={<><label className="block text-sm">Action amount<Input aria-label="Unstaking or withdrawal amount" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>{staking.owner && <section className="rounded-xl border p-4 space-y-4"><h2 className="font-semibold">My Stakes</h2><p className="text-sm">Enter the amount to unstake in the amount field above.</p>{staking.positions.isPending && <p>Loading</p>}{staking.positions.data?.length === 0 && <p>No staking positions.</p>}{staking.positions.data?.map((position) => <div key={position.contract} className="border-b pb-3 space-y-2"><p className="break-all">{staking.validators.data?.find((item) => item.provider === position.contract)?.identity ?? position.contract}</p><p>Staked {tokens(position.active)}  · Unstaked, not withdrawn {tokens(position.unstaked)}  · Withdrawable {tokens(position.withdrawable)} EGLD</p><p>Rewards {tokens(position.rewards)} EGLD</p><div className="flex flex-wrap gap-2"><Button variant="outline" disabled={staking.pending || !amount || position.active === BigInt(0)} onClick={() => staking.execute({ kind: 'undelegate', contract: position.contract, amount })}>Request Unstake</Button><Button variant="outline" disabled={staking.pending || position.withdrawable === BigInt(0)} onClick={() => staking.execute({ kind: 'withdraw', contract: position.contract })}>Withdraw</Button>{([{ kind: 'claim', label: 'Claim Rewards' }, { kind: 'compound', label: 'Restake Rewards' }] as const).map((action) => <Button variant="outline" key={action.kind} disabled={staking.pending || position.rewards === BigInt(0)} onClick={() => staking.execute({ kind: action.kind, contract: position.contract })}>{action.label}</Button>)}</div></div>)}</section>}</>}
    />
    {transactionFeedback}
  </div>;
}
