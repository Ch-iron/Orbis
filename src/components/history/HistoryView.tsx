'use client';

import { useState } from 'react';
import { useWalletInfo } from '@/hooks/useWalletInfo';
import { useTxHistory } from '@/hooks/useStaking';
import { useChain } from '@/hooks/useChain';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatTokenAmount, truncateAddress } from '@/lib/utils/format';
import { Wallet, ExternalLink } from 'lucide-react';
import type { TxHistoryEntry } from '@/lib/chains/types';

const TX_TYPE_LABELS: Record<TxHistoryEntry['type'], string> = {
  delegate: 'Delegate',
  undelegate: 'Undelegate',
  redelegate: 'Redelegate',
  withdraw_rewards: 'Harvest',
  send: 'Send',
  unknown: 'Unknown',
};

const TX_TYPE_VARIANT: Record<TxHistoryEntry['type'], 'default' | 'secondary' | 'destructive'> = {
  delegate: 'default',
  undelegate: 'destructive',
  redelegate: 'secondary',
  withdraw_rewards: 'default',
  send: 'secondary',
  unknown: 'secondary',
};

const ITEMS_PER_PAGE = 20;

const HistoryView = () => {
  const { isConnected } = useWalletInfo();
  const { config } = useChain();
  const [currentPage, setCurrentPage] = useState(1);
  const { data, isLoading } = useTxHistory(currentPage);
  const { decimals, symbol } = config.stakingToken;

  const transactions = data?.entries ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Wallet className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-2xl font-semibold">Connect Your Wallet</h2>
        <p className="text-muted-foreground">Connect your wallet to view transaction history</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Transaction History</h1>
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <>
              <HistoryTable
                transactions={transactions}
                decimals={decimals}
                symbol={symbol}
                explorerUrl={config.explorer}
              />
              {total > ITEMS_PER_PAGE && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

type HistoryTableProps = {
  transactions: TxHistoryEntry[];
  decimals: number;
  symbol: string;
  explorerUrl: string;
};

const HistoryTable = ({ transactions, decimals, symbol, explorerUrl }: HistoryTableProps) => {
  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
        <p>No transactions found</p>
        <p className="text-sm">Transaction history will appear here once you start staking</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>Tx Hash</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Time</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map((tx) => (
          <TableRow key={tx.hash}>
            <TableCell>
              <Badge variant={TX_TYPE_VARIANT[tx.type]}>
                {TX_TYPE_LABELS[tx.type]}
              </Badge>
            </TableCell>
            <TableCell>
              <a
                href={`${explorerUrl}/tx/${tx.evmHash ?? tx.hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {truncateAddress(tx.evmHash ?? tx.hash, 8, 6)}
                <ExternalLink className="h-3 w-3" />
              </a>
            </TableCell>
            <TableCell className="text-right">
              {tx.amount ? `${formatTokenAmount(tx.amount, decimals, 4)} ${symbol}` : '-'}
            </TableCell>
            <TableCell>
              <Badge variant={tx.success ? 'default' : 'destructive'}>
                {tx.success ? 'Success' : 'Failed'}
              </Badge>
            </TableCell>
            <TableCell className="text-right text-sm text-muted-foreground">
              {tx.timestamp.toLocaleDateString()}{' '}
              {tx.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

const MAX_VISIBLE_PAGES = 5;

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

const buildPageNumbers = (
  currentPage: number,
  totalPages: number,
): Array<number | 'ellipsis'> => {
  if (totalPages <= MAX_VISIBLE_PAGES) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  // Always show first, last, current, and neighbors
  const pages = new Set<number>([1, totalPages, currentPage]);

  if (currentPage > 1) {
    pages.add(currentPage - 1);
  }

  if (currentPage < totalPages) {
    pages.add(currentPage + 1);
  }

  const sorted = [...pages].sort((pageA, pageB) => pageA - pageB);

  const result: Array<number | 'ellipsis'> = [];
  for (const page of sorted) {
    const previous = result[result.length - 1];
    if (typeof previous === 'number' && page - previous > 1) {
      result.push('ellipsis');
    }
    result.push(page);
  }

  return result;
};

const Pagination = ({ currentPage, totalPages, onPageChange }: PaginationProps) => {
  const pageNumbers = buildPageNumbers(currentPage, totalPages);

  return (
    <div className="flex items-center justify-center gap-1 pt-4">
      {pageNumbers.map((item, index) => {
        if (item === 'ellipsis') {
          return (
            <span
              key={`ellipsis-${index}`}
              className="px-2 text-sm text-muted-foreground"
            >
              ...
            </span>
          );
        }

        return (
          <Button
            key={item}
            variant={item === currentPage ? 'default' : 'outline'}
            size="sm"
            className="min-w-9"
            onClick={() => onPageChange(item)}
          >
            {item}
          </Button>
        );
      })}
    </div>
  );
};

export { HistoryView };
