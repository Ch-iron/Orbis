'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useValidators, useDelegations } from '@/hooks/useStaking';
import { useChain } from '@/hooks/useChain';
import { formatPercentage, formatTokenAmount } from '@/lib/utils/format';
import { ArrowUpDown, Search, Check } from 'lucide-react';
import { StakeDialog } from './StakeDialog';
import type { Validator } from '@/lib/chains/types';

type SortField = 'commission' | 'votingPower' | 'name';
type SortDirection = 'asc' | 'desc';

const STATUS_VARIANT_MAP: Record<string, 'default' | 'secondary' | 'destructive'> = {
  active: 'default',
  inactive: 'secondary',
  jailed: 'destructive',
};

const ValidatorTable = () => {
  const { config } = useChain();
  const { data: validators, isLoading } = useValidators();
  const { data: delegations } = useDelegations();
  const delegatedAddresses = useMemo(() => {
    if (!delegations) {
      return new Set<string>();
    }
    return new Set(delegations.map((delegation) => delegation.validatorAddress));
  }, [delegations]);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('votingPower');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedValidator, setSelectedValidator] = useState<Validator | null>(null);
  const [stakeDialogOpen, setStakeDialogOpen] = useState(false);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
      return;
    }
    setSortField(field);
    setSortDirection('desc');
  };

  const filteredAndSorted = useMemo(() => {
    if (!validators) {
      return [];
    }

    const filtered = validators.filter((validator) =>
      validator.status === 'active' &&
      validator.name.toLowerCase().includes(search.toLowerCase())
    );

    return filtered.sort((a, b) => {
      const multiplier = sortDirection === 'asc' ? 1 : -1;

      if (sortField === 'commission') {
        return (a.commission - b.commission) * multiplier;
      }
      if (sortField === 'votingPower') {
        return (BigInt(a.votingPower) > BigInt(b.votingPower) ? 1 : -1) * multiplier;
      }
      return a.name.localeCompare(b.name) * multiplier;
    });
  }, [validators, search, sortField, sortDirection]);

  const handleDelegate = (validator: Validator) => {
    setSelectedValidator(validator);
    setStakeDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Validators</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <CardTitle>Validators ({filteredAndSorted.length})</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search validators..."
              value={search}
              onChange={(event) => { setSearch(event.target.value); }}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => { handleSort('name'); }}>
                    Validator <ArrowUpDown className="h-3 w-3 ml-1" />
                  </Button>
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => { handleSort('commission'); }}>
                    Commission <ArrowUpDown className="h-3 w-3 ml-1" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => { handleSort('votingPower'); }}>
                    Voting Power <ArrowUpDown className="h-3 w-3 ml-1" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSorted.map((validator) => (
                <TableRow key={validator.address}>
                  <TableCell className="font-medium max-w-[200px]">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate">{validator.name}</span>
                      {delegatedAddresses.has(validator.address) && (
                        <Badge className="shrink-0 gap-0.5 text-xs px-1.5 py-0 bg-primary text-primary-foreground hover:bg-primary/90">
                          <Check className="h-3 w-3" />
                          Staked
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT_MAP[validator.status] ?? 'secondary'}>
                      {validator.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatPercentage(validator.commission)}</TableCell>
                  <TableCell>
                    {formatTokenAmount(validator.votingPower, config.stakingToken.decimals, 0)} {config.stakingToken.symbol}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      onClick={() => { handleDelegate(validator); }}
                      disabled={validator.status !== 'active'}
                    >
                      Delegate
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredAndSorted.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8">
                    <div className="flex flex-col items-center gap-3">
                      <img src="/mascot-empty.svg" alt="No validators" width={80} height={80} />
                      <p className="text-muted-foreground">No validators found</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedValidator && (
        <StakeDialog
          open={stakeDialogOpen}
          onOpenChange={setStakeDialogOpen}
          validator={selectedValidator}
        />
      )}
    </>
  );
};

export { ValidatorTable };
