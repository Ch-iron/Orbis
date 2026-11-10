'use client';

import { useState, type ReactNode } from 'react';
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
};

export function StakingTargetTable({ targets, value, onSelect, loading, error, pending }: StakingTargetTableProps) {
  const [search, setSearch] = useState('');
  const query = search.trim().toLowerCase();
  const visible = targets.filter((target) => `${target.name} ${target.id}`.toLowerCase().includes(query));

  if (error) return <p role="alert" className="text-sm text-destructive">{error.message}</p>;
  if (loading) return <p role="status" className="text-sm text-muted-foreground">Loading validators and pools…</p>;

  return (
    <div className="space-y-4">
      <Input aria-label="Search validators or pools" placeholder="Search by name or address" value={search} onChange={(event) => setSearch(event.target.value)} />
      <div className="max-h-96 overflow-auto rounded-lg border">
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
                  <Button size="sm" variant={target.id === value ? 'secondary' : 'default'} disabled={pending} aria-pressed={target.id === value} onClick={() => { if (!pending) onSelect(target.id); }}>
                    {target.id === value ? 'Selected' : 'Select'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {visible.length === 0 && <TableRow><TableCell colSpan={3} className="py-12 text-center text-muted-foreground">No validators or pools found.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
