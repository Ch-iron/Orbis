'use client';

import { useState, type ReactNode } from 'react';
import { Search } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PoolStakeDialog } from './PoolStakeDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type StakingTarget = {
  id: string;
  name: string;
  details: ReactNode;
};

type StakingTargetTableProps = {
  targets: StakingTarget[];
  value: string;
  onSelect: (id: string) => void;
  loading: boolean;
  error: Error | null;
  pending: boolean;
  children?: ReactNode;
};

export function StakingTargetTable({ targets, value, onSelect, loading, error, pending, children }: StakingTargetTableProps) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const selected = targets.find((target) => target.id === value);
  const changeOpen = (next: boolean) => { if (!pending) setOpen(next); };
  const query = search.trim().toLowerCase();
  const visible = targets.filter((target) => `${target.name} ${target.id}`.toLowerCase().includes(query));

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <CardTitle>Validators ({visible.length})</CardTitle>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" aria-label="Search validators or pools" placeholder="Search name or address..." value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          {error ? <p role="alert" className="text-sm text-destructive">{error.message}</p> : loading ? (
            <div role="status" className="flex flex-col gap-3">
              <span className="sr-only">Loading validators and pools…</span>
              {Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-12 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Validator / Pool</TableHead>
                  <TableHead>Staking conditions</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((target) => (
                  <TableRow key={target.id} data-state={target.id === value ? 'selected' : undefined}>
                    <TableCell className="max-w-72 whitespace-normal">
                      <p className="font-medium break-all">{target.name}</p>
                      {target.name !== target.id && <p className="text-xs text-muted-foreground break-all">{target.id}</p>}
                    </TableCell>
                    <TableCell className="whitespace-normal text-sm">{target.details}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant={target.id === value ? 'secondary' : 'default'} disabled={pending} aria-pressed={target.id === value} onClick={() => { if (pending) return; onSelect(target.id); setOpen(true); }}>
                        {children ? 'Stake' : target.id === value ? 'Selected' : 'Select'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {visible.length === 0 && <TableRow><TableCell colSpan={3} className="py-12 text-center text-muted-foreground">No validators or pools found.</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      {children && selected && (
        <PoolStakeDialog open={open} onOpenChange={changeOpen} title={`Stake with ${selected.name}`} pending={pending}>
          <div className="text-sm text-muted-foreground">{selected.details}</div>
          {children}
        </PoolStakeDialog>
      )}
    </>
  );
}
