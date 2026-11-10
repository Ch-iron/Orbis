'use client';

import { useState } from 'react';
import { PoolStakingTabs } from '@/features/staking/PoolStakingTabs';
import type { ChainConfig } from '@/lib/chains/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WalletSelectDialog } from '@/components/layout/WalletSelectDialog';
import { formatTokenAmount, formatPercentage } from '@/lib/utils/format';
import { useNativeCosmosStaking } from './useNativeCosmosStaking';

export function NativeCosmosStakingView({ config }: { config: ChainConfig }) {
  const staking = useNativeCosmosStaking(config);
  const [walletOpen, setWalletOpen] = useState(false);
  const [operation, setOperation] = useState<'delegate' | 'undelegate' | 'redelegate'>('delegate');
  const [validator, setValidator] = useState('');
  const [destination, setDestination] = useState('');
  const [amount, setAmount] = useState('');
  const [search, setSearch] = useState('');
  const { decimals, symbol } = config.stakingToken;
  const validators = staking.validators.data ?? [];
  const active = validators.filter((item) => item.status === 'active');
  const name = (address: string) => validators.find((item) => item.address === address)?.name ?? address;
  const choices = operation === 'delegate' ? active.map((item) => ({ address: item.address, label: item.name })) : (staking.delegations.data ?? []).map((item) => ({ address: item.validatorAddress, label: `${name(item.validatorAddress)} · ${formatTokenAmount(item.amount, decimals)} ${symbol}` }));
  const selectedValidator = choices.some((item) => item.address === validator) ? validator : '';
  const queryError = [staking.validators, staking.balance, staking.delegations, staking.rewards, staking.unbonding, staking.duration].find((query) => query.error)?.error;
  const rewards = staking.rewards.data?.tokens ?? [];
  const claimable = rewards.some((coin) => BigInt(coin.amount) > BigInt(0));

  function submit() {
    if (operation === 'redelegate') void staking.execute({ type: operation, validator: selectedValidator, destination, amount });
    else void staking.execute({ type: operation, validator: selectedValidator, amount });
  }

  const management = (<Card><CardHeader><CardTitle>Manage stake</CardTitle></CardHeader><CardContent className="flex flex-col gap-4">
      <p>Available: {staking.balance.data === undefined ? '-' : formatTokenAmount(staking.balance.data, decimals)} {symbol}</p>
      <div className="flex flex-wrap gap-2">
        {(['delegate', 'undelegate', 'redelegate'] as const).map((value) => <Button key={value} variant={operation === value ? 'default' : 'outline'} disabled={staking.pending} onClick={() => { setOperation(value); setValidator(''); setAmount(''); }}>{value === 'delegate' ? 'Stake' : value === 'undelegate' ? 'Unstake' : 'Redelegate'}</Button>)}
      </div>
      <label className="flex flex-col gap-2 text-sm">{operation === 'delegate' ? 'Validator' : 'Current delegation'}
        <select className="rounded-md border bg-background p-2" value={selectedValidator} disabled={staking.pending} onChange={(event) => setValidator(event.target.value)}>
          <option value="">Select validator</option>{choices.map((item) => <option key={item.address} value={item.address}>{item.label}</option>)}
        </select>
      </label>
      {operation === 'redelegate' && <label className="flex flex-col gap-2 text-sm">Destination validator
        <select className="rounded-md border bg-background p-2" value={destination} disabled={staking.pending} onChange={(event) => setDestination(event.target.value)}>
          <option value="">Select destination</option>{active.filter((item) => item.address !== selectedValidator).map((item) => <option key={item.address} value={item.address}>{item.name}</option>)}
        </select>
      </label>}
      <label className="flex flex-col gap-2 text-sm">Amount ({symbol})<Input value={amount} inputMode="decimal" disabled={staking.pending} onChange={(event) => setAmount(event.target.value)} placeholder="0.0" /></label>
      {staking.duration.data !== undefined && <p className="text-sm text-muted-foreground">Current unbonding period: {(staking.duration.data / 86400).toFixed(2)} days. Unbonded tokens return automatically when the period ends.</p>}
      <Button className="self-start" disabled={!staking.connected || staking.pending || !selectedValidator || !amount || (operation === 'redelegate' && !destination)} onClick={submit}>{staking.pending ? 'Waiting for wallet / confirmation…' : 'Review in wallet'}</Button>
      {staking.hash && <a className="break-all text-sm underline" href={`${config.explorer}/tx/${staking.hash}`} target="_blank" rel="noreferrer">View transaction: {staking.hash}</a>}
    </CardContent></Card>);

  return <div className="flex flex-col gap-6">
    <h1 className="text-2xl font-bold">{config.name} Staking</h1>
    {!staking.connected && <Button className="self-start" onClick={() => setWalletOpen(true)}>Connect wallet</Button>}
    <WalletSelectDialog open={walletOpen} onOpenChange={setWalletOpen} />
    {(queryError || staking.error) && <p role="alert" className="break-words text-sm text-destructive">{staking.error ?? queryError?.message}</p>}
    <PoolStakingTabs connected={staking.connected} pending={staking.pending} selection={<><Card><CardHeader><CardTitle>Validators</CardTitle></CardHeader><CardContent className="flex flex-col gap-3">
      <Input aria-label="Search validators" placeholder="Search validators" value={search} onChange={(event) => setSearch(event.target.value)} />
      {staking.validators.isLoading && <p>Loading validators…</p>}
      {active.filter((item) => `${item.name} ${item.address}`.toLowerCase().includes(search.toLowerCase())).map((item) => <div key={item.address} className="flex items-center justify-between gap-3 border-b py-2"><div className="min-w-0"><p>{item.name}</p><p className="break-all text-xs text-muted-foreground">{item.address}</p><p className="text-sm">Commission: {formatPercentage(item.commission)}</p></div><Button variant="outline" disabled={staking.pending} onClick={() => { setOperation('delegate'); setValidator(item.address); }}>Select</Button></div>)}
    </CardContent></Card>{management}</>} positions={<>{management}<Card><CardHeader><CardTitle>Staking rewards</CardTitle></CardHeader><CardContent className="flex flex-col gap-3">
      {staking.rewards.isLoading ? <p>Loading rewards…</p> : rewards.length ? rewards.map((coin) => <p key={coin.denom}>{formatTokenAmount(coin.amount, coin.decimals)} {coin.symbol}</p>) : <p className="text-muted-foreground">{staking.connected && staking.rewards.data ? 'No claimable rewards.' : 'Connect a wallet to view rewards.'}</p>}
      <Button className="self-start" disabled={!claimable || staking.pending || !staking.connected} onClick={() => void staking.execute({ type: 'claim', validators: staking.rewards.data?.perValidator.map((item) => item.validatorAddress) ?? [] })}>Claim rewards</Button>
      {config.slug === 'dydx' && <p className="text-sm text-muted-foreground">USDC and DYDX rewards are separate assets. Claiming USDC does not stake it as DYDX.</p>}
    </CardContent></Card><Card><CardHeader><CardTitle>Unbonding</CardTitle></CardHeader><CardContent className="flex flex-col gap-3">
      {staking.unbonding.data?.map((entry, index) => <div key={`${entry.validatorAddress}-${index}`}><p>{name(entry.validatorAddress)} · {formatTokenAmount(entry.amount, decimals)} {symbol}</p><p className="text-sm text-muted-foreground">{entry.completionTime?.toLocaleString()}</p></div>)}
      {staking.unbonding.data?.length === 0 && <p className="text-muted-foreground">No unbonding entries.</p>}
    </CardContent></Card></>} />
  </div>;
}
