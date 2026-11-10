'use client';
import { useState } from 'react';
import { PoolStakingTabs } from '@/features/staking/PoolStakingTabs';
import { StakingTargetTable } from '@/features/staking/StakingTargetTable';
import { formatEther } from 'viem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WalletSelectDialog } from '@/components/layout/WalletSelectDialog';
import { usePolygonStaking } from './usePolygonStaking';
export function PolygonStakingView() {
  const staking = usePolygonStaking();
  const [id, setId] = useState('');
  const [amount, setAmount] = useState('');
  const [open, setOpen] = useState(false);
  const ready = staking.connected && staking.correctNetwork && !staking.pending;
  const errors = [staking.validators.error, staking.positions.error, staking.withdrawals.error, staking.balance.error, staking.gasBalance.error].filter(Boolean);
  return <div className="space-y-6"><h1 className="text-2xl font-bold">Polygon POL Staking</h1><p className="text-sm text-muted-foreground">Polygon validator delegation runs on Ethereum mainnet. You need POL on Ethereum and ETH for gas. After unstaking, withdrawal availability depends on checkpoint progress.</p>
    <WalletSelectDialog open={open} onOpenChange={setOpen} />{(!staking.connected || !staking.correctNetwork) && <Button onClick={() => setOpen(true)}>Connect Ethereum Wallet or Switch Network</Button>}<p>POL: {staking.balance.data !== undefined ? formatEther(staking.balance.data) : 'Not loaded'}  · ETH for gas: {staking.gasBalance.data !== undefined ? formatEther(staking.gasBalance.data) : 'Not loaded'}</p>
    {errors.map((error, index) => <p key={index} role="alert" className="text-destructive">{error?.message}</p>)}
    <PoolStakingTabs connected={!!staking.connected} pending={staking.pending}
      selection={<><section className="rounded-xl border p-4 space-y-4"><h2 className="font-semibold">Select a validator</h2>{staking.validators.isPending && <p>Loading</p>}<StakingTargetTable targets={(staking.validators.data ?? []).filter((item) => item.status === 'active' && item.isDelegationEnabled).map((item) => ({ id: String(item.id), name: item.name, details: <>Commission {item.commissionPercentage}%</> }))} value={id} onSelect={setId} loading={staking.validators.isPending} error={staking.validators.error} pending={staking.pending} /><p className="text-xs text-muted-foreground">Annual validator yield rates are currently unavailable.</p>
      <Input aria-label="POL amount" placeholder="POL amount" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} /><Button disabled={!ready || !id || !amount} onClick={() => staking.execute({ kind: 'stake', id: BigInt(id), amount })}>Stake</Button>
    </section></>}
      positions={<><label className="block text-sm">Action amount<Input aria-label="Unstaking or withdrawal amount" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>{staking.connected && <section className="rounded-xl border p-4 space-y-4"><h2 className="font-semibold">My Stakes</h2><p className="text-sm">Enter the amount to unstake in the amount field above.</p>{staking.positions.isPending && <p>Loading</p>}{staking.positions.data?.length === 0 && <p>No staking positions.</p>}{staking.positions.data?.map((position) => <div key={position.id.toString()} className="border-b pb-3 space-y-2"><p>{staking.validators.data?.find((item) => BigInt(item.id) === position.id)?.name ?? `Validator ${position.id}`}</p><p>Staked {formatEther(position.amount)}  · Rewards {formatEther(position.rewards)} POL</p><div className="flex flex-wrap gap-2"><Button variant="outline" disabled={!ready || !amount || position.amount === BigInt(0)} onClick={() => staking.execute({ kind: 'unstake', id: position.id, amount })}>Request Unstake</Button>{([{ kind: 'claim', label: 'Claim Rewards' }, { kind: 'compound', label: 'Restake Rewards' }] as const).map((action) => <Button variant="outline" key={action.kind} disabled={!ready || position.rewards === BigInt(0)} onClick={() => staking.execute({ kind: action.kind, id: position.id })}>{action.label}</Button>)}</div></div>)}</section>}
{staking.connected && <section className="rounded-xl border p-4 space-y-4"><h2 className="font-semibold">Unstaking Requests</h2>{staking.withdrawals.isPending && <p>Loading</p>}{staking.withdrawals.data?.map((item) => <div key={`${item.id}-${item.nonce}`} className="space-y-2"><p>Validator {item.id.toString()} · {formatEther(item.amount)}  POL · Checkpoint {item.epoch.toString()} / {item.claimEpoch.toString()}</p><Button variant="outline" disabled={!ready || !item.ready} onClick={() => staking.execute({ kind: 'withdraw', id: item.id, nonce: item.nonce })}>Withdraw</Button></div>)}</section>}</>}
    />
    {staking.pending && <p role="status">Waiting for wallet approval and transaction confirmation.</p>}{staking.error && <p role="alert" className="text-destructive">{staking.error}</p>}{staking.hash && <a className="block break-all underline" href={`https://etherscan.io/tx/${staking.hash}`} target="_blank" rel="noreferrer">{staking.confirmed ? 'Confirmed transaction' : 'Submitted transaction'}: {staking.hash}</a>}
  </div>;
}
