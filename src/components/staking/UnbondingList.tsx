'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useUnbonding } from '@/hooks/useStaking';
import { useChain } from '@/hooks/useChain';
import { formatTokenAmount } from '@/lib/utils/format';

const formatRemainingTime = (completionTime: Date): string => {
  const now = new Date();
  const diffMs = completionTime.getTime() - now.getTime();

  if (diffMs <= 0) {
    return 'Complete';
  }

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) {
    return `${days}d ${hours}h remaining`;
  }

  return `${hours}h remaining`;
};

const UnbondingList = () => {
  const { config } = useChain();
  const { data: entries, isLoading } = useUnbonding();
  const { decimals, symbol } = config.stakingToken;

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle>Unbonding</CardTitle></CardHeader>
        <CardContent>
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!entries || entries.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Unbonding</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Validator</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry, index) => (
              <TableRow key={`${entry.validatorAddress}-${index}`}>
                <TableCell className="font-medium">{entry.validatorName}</TableCell>
                <TableCell className="text-right">
                  {formatTokenAmount(entry.amount, decimals, 4)} {symbol}
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant="secondary">
                    {formatRemainingTime(entry.completionTime)}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export { UnbondingList };
