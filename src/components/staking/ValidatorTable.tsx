'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useValidators, useDelegations } from '@/hooks/useStaking';
import { useChain } from '@/hooks/useChain';
import { useStakingApy } from '@/hooks/useStakingApy';
import { getValidatorYield, compareValidatorYields } from '@/features/staking/validator-yield';
import { formatPercentage, formatTokenAmount } from '@/lib/utils/format';
import Image from 'next/image';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ArrowUpDown, Search, Check } from 'lucide-react';
import { StakeDialog } from './StakeDialog';
import type { Validator } from '@/lib/chains/types';

type SortField = 'commission' | 'votingPower' | 'name' | 'apy';
type SortDirection = 'asc' | 'desc';

const STATUS_VARIANT_MAP: Record<
  string,
  'default' | 'secondary' | 'destructive'
> = {
  active: 'default',
  inactive: 'secondary',
  jailed: 'destructive',
};

const ValidatorTable = () => {
  const { config } = useChain();
  const { apy: networkRate } = useStakingApy(config.slug === 'sei');
  const { data: validators, isLoading, error } = useValidators();
  const { data: delegations } = useDelegations();
  const delegatedAddresses = useMemo(() => {
    if (!delegations) {
      return new Set<string>();
    }
    return new Set(
      delegations.map((delegation) => delegation.validatorAddress),
    );
  }, [delegations]);
  const [search, setSearch] = useState('');
  const [delegatableOnly, setDelegatableOnly] = useState(false);
  const [sortField, setSortField] = useState<SortField>('votingPower');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedValidator, setSelectedValidator] = useState<Validator | null>(
    null,
  );
  const [stakeDialogOpen, setStakeDialogOpen] = useState(false);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
      return;
    }
    setSortField(field);
    setSortDirection('desc');
  };

  const hasApy = useMemo(() => {
    if (config.slug === 'sei' || config.slug === 'kaia') {
      return true;
    }
    if (!validators) {
      return false;
    }
    return validators.some((validator) => validator.apy !== undefined);
  }, [validators, config.slug]);

  const hasDelegatable = useMemo(() => {
    if (!validators) {
      return false;
    }
    return validators.some((validator) => validator.delegatable === false);
  }, [validators]);

  const filteredAndSorted = useMemo(() => {
    if (!validators) {
      return [];
    }

    const filtered = validators.filter(
      (validator) =>
        validator.status === 'active' &&
        (validator.name.toLowerCase().includes(search.trim().toLowerCase()) || validator.address.toLowerCase().includes(search.trim().toLowerCase())) &&
        (!delegatableOnly || validator.delegatable !== false),
    );

    return filtered.sort((validatorA, validatorB) => {
      const multiplier = sortDirection === 'asc' ? 1 : -1;

      if (sortField === 'commission') {
        return (validatorA.commission - validatorB.commission) * multiplier;
      }
      if (sortField === 'votingPower') {
        const a = BigInt(validatorA.votingPower);
        const b = BigInt(validatorB.votingPower);
        return (a === b ? 0 : a > b ? 1 : -1) * multiplier;
      }
      if (sortField === 'apy') {
        return compareValidatorYields(
          getValidatorYield(config.slug, validatorA, networkRate),
          getValidatorYield(config.slug, validatorB, networkRate),
          sortDirection,
        );
      }
      return validatorA.name.localeCompare(validatorB.name) * multiplier;
    });
  }, [validators, search, delegatableOnly, sortField, sortDirection, config.slug, networkRate]);

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
          <div className='flex flex-col gap-3'>
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className='h-12 w-full' />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) return <Card><CardHeader><CardTitle>Validators</CardTitle></CardHeader><CardContent>
    <p role="alert" className="text-sm text-destructive">Validator data unavailable: {error.message}</p>
  </CardContent></Card>;

  return (
    <>
      <Card>
        <CardHeader className='flex flex-row items-center justify-between gap-4 flex-wrap'>
          <CardTitle>Validators ({filteredAndSorted.length})</CardTitle>
          <div className='flex flex-wrap items-center gap-2 min-w-0'>
            {hasDelegatable && (
              <div className='flex items-center gap-2'>
                <Switch
                  id='delegatable-filter'
                  checked={delegatableOnly}
                  onCheckedChange={setDelegatableOnly}
                />
                <Label htmlFor='delegatable-filter' className='text-sm cursor-pointer'>
                  Delegatable
                </Label>
              </div>
            )}
            <div className='relative w-full sm:w-64'>
              <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
              <Input
                aria-label='Search validators by name or address'
                placeholder='Search name or address...'
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                }}
                className='pl-9'
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {config.slug === 'sei' && (
            <p className='mb-4 text-sm text-muted-foreground'>
              APR (annual percentage rate) uses the same calculation as the Sei Dashboard:
              current mint rate, bonded stake, community tax and validator commission.
              It excludes compounding; values may differ slightly as chain data updates.
            </p>
          )}
          {config.slug === 'kaia' && (
            <p className='mb-4 text-sm text-muted-foreground'>
              APY (annual percentage yield) is reported per validator by Kaia Square.
              Unavailable rates are shown as a dash.
            </p>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => {
                      handleSort('name');
                    }}
                  >
                    Validator <ArrowUpDown className='h-3 w-3 ml-1' />
                  </Button>
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => {
                      handleSort('commission');
                    }}
                  >
                    Commission <ArrowUpDown className='h-3 w-3 ml-1' />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => {
                      handleSort('votingPower');
                    }}
                  >
                    Voting Power <ArrowUpDown className='h-3 w-3 ml-1' />
                  </Button>
                </TableHead>
                {hasApy && (
                  <TableHead>
                    <Button
                      variant='ghost'
                      size='sm'
                      onClick={() => {
                        handleSort('apy');
                      }}
                    >
                      {config.slug === 'sei' ? 'APR' : 'APY'} <ArrowUpDown className='h-3 w-3 ml-1' />
                    </Button>
                  </TableHead>
                )}
                <TableHead className='text-right'>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSorted.map((validator) => {
                const validatorYield = getValidatorYield(config.slug, validator, networkRate);
                return (
                <TableRow key={validator.address}>
                  <TableCell className='font-medium max-w-[200px]'>
                    <div className='flex items-center gap-1.5'>
                      {validator.logo && (
                        <Image
                          src={validator.logo}
                          alt={validator.name}
                          width={20}
                          height={20}
                          className='shrink-0 rounded-full'
                        />
                      )}
                      <span className='truncate'>{validator.name}</span>
                      {delegatedAddresses.has(validator.address) && (
                        <Badge className='shrink-0 gap-0.5 text-xs px-1.5 py-0 bg-primary text-primary-foreground hover:bg-primary/90'>
                          <Check className='h-3 w-3' />
                          Staked
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        STATUS_VARIANT_MAP[validator.status] ?? 'secondary'
                      }
                    >
                      {validator.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {formatPercentage(validator.commission)}
                  </TableCell>
                  <TableCell>
                    {formatTokenAmount(
                      validator.votingPower,
                      config.stakingToken.decimals,
                      0,
                    )}{' '}
                    {config.stakingToken.symbol}
                  </TableCell>
                  {hasApy && (
                    <TableCell>
                      {validatorYield !== null
                        ? formatPercentage(validatorYield)
                        : '-'}
                    </TableCell>
                  )}
                  <TableCell className='text-right'>
                    <Button
                      size='sm'
                      variant={validator.delegatable === false ? 'secondary' : 'default'}
                      disabled={validator.delegatable === false}
                      onClick={() => {
                        handleDelegate(validator);
                      }}
                    >
                      Delegate
                    </Button>
                  </TableCell>
                </TableRow>
                );
              })}
              {filteredAndSorted.length === 0 && (
                <TableRow>
                  <TableCell colSpan={hasApy ? 6 : 5} className='py-8'>
                    <div className='flex flex-col items-center gap-3'>
                      <Image
                        src='/empty.svg'
                        alt='No validators'
                        width={80}
                        height={80}
                      />
                      <p className='text-muted-foreground'>
                        No validators found
                      </p>
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
          onOpenChange={(open) => {
            setStakeDialogOpen(open);
            if (!open) {
              setSelectedValidator(null);
            }
          }}
          validator={selectedValidator}
        />
      )}
    </>
  );
};

export { ValidatorTable };
