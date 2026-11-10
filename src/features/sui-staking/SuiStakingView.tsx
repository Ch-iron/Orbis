'use client';

import { useState } from 'react';
import { PoolStakingTabs } from '@/features/staking/PoolStakingTabs';
import { StakingTargetTable } from '@/features/staking/StakingTargetTable';
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
    <h1 className="text-2xl font-bold">Sui Staking</h1>
    <p className="text-sm text-muted-foreground">Withdrawing returns both the principal and accumulated rewards of the selected stake object.</p>
    <WalletSelectDialog open={open} onOpenChange={setOpen} />
    {!staking.owner && <Button onClick={() => setOpen(true)}>Connect Sui Wallet</Button>}
    <p>Wallet balance: {staking.balance.data ? `${tokens(staking.balance.data.balance.balance)} SUI` : 'Not loaded'}</p>
    {errors.map((error, index) => <p key={index} role="alert" className="text-destructive">{error?.message}</p>)}
    <PoolStakingTabs connected={!!staking.owner} pending={staking.pending}
      selection={<><section className="rounded-xl border p-4 space-y-4"><h2 className="font-semibold">Select a validator</h2>{staking.validators.isPending && <p>Loading</p>}
      <StakingTargetTable targets={(staking.validators.data ?? []).map((item) => ({ id: item.address, name: item.name, details: <>Commission {(item.commission * 100).toFixed(2)}%</> }))} value={validator} onSelect={setValidator} loading={staking.validators.isPending} error={staking.validators.error} pending={staking.pending} />
      {selected && <div><p>{selected.name}</p>{selected.activationEpoch !== undefined && <ValidatorYield tableId={selected.exchangeRatesId} activationEpoch={selected.activationEpoch} />}</div>}
      <Input aria-label="Stake SUI" placeholder="SUI amount" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} />
      <Button disabled={!staking.owner || !validator || !amount || staking.pending} onClick={() => staking.execute({ kind: 'stake', validator, amount })}>Stake</Button>
    </section></>}
      positions={<>{staking.owner && <section className="rounded-xl border p-4 space-y-4"><h2 className="font-semibold">My Stakes</h2>{staking.positions.isPending && <p>Loading</p>}{staking.positions.data?.length === 0 && <p>No staking positions.</p>}{staking.positions.data?.map((position) => <div key={position.objectId} className="border-b pb-3 space-y-2"><p>{position.validatorName}</p><p>{tokens(position.principal)}  SUI · Estimated rewards {position.rewards === null ? 'Unavailable' : `${tokens(position.rewards)} SUI`}</p><p className="text-sm">{position.pending ? `Pending activation · Epoch ${position.activationEpoch}` : 'Active stake'}</p><Button variant="outline" disabled={staking.pending} onClick={() => staking.execute({ kind: 'withdraw', objectId: position.objectId })}>Withdraw Principal and Rewards</Button></div>)}</section>}</>}
    />
    {staking.pending && <p role="status">Waiting for simulation, wallet approval, and transaction confirmation.</p>}{staking.error && <p role="alert" className="text-destructive">{staking.error}</p>}{staking.digest && <a className="block break-all underline" href={`https://suiscan.xyz/mainnet/tx/${staking.digest}`} target="_blank" rel="noreferrer">{staking.confirmed ? 'Confirmed transaction' : 'Submitted transaction'}: {staking.digest}</a>}
  </div>;
}

function ValidatorYield({ tableId, activationEpoch }: { tableId: string; activationEpoch: bigint }) {
  const query = useSuiValidatorYield(tableId, activationEpoch);
  return <div><p>Estimated APY: {query.data !== undefined ? `${(query.data * 100).toFixed(2)}%` : query.error ? 'Unavailable' : 'Loading'}</p><p className="text-xs text-muted-foreground">Annualized compound yield based on pool exchange rate changes over up to the last 30 epochs. Past performance does not guarantee future returns.</p></div>;
}
