'use client';

import type { ReactNode } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type PoolStakingTabsProps = {
  selection: ReactNode;
  positions: ReactNode;
  connected: boolean;
  pending: boolean;
};

export function PoolStakingTabs({ selection, positions, connected, pending }: PoolStakingTabsProps) {
  return (
    <Tabs defaultValue="validators">
      <TabsList>
        <TabsTrigger value="validators" disabled={pending}>Validators / Pools</TabsTrigger>
        <TabsTrigger value="positions" disabled={pending}>My Staking</TabsTrigger>
      </TabsList>
      <TabsContent value="validators" className="mt-4 space-y-6">{selection}</TabsContent>
      <TabsContent value="positions" className="mt-4 space-y-6">
        {connected ? positions : <p className="py-16 text-center text-muted-foreground">Connect your wallet to view your staking.</p>}
      </TabsContent>
    </Tabs>
  );
}
