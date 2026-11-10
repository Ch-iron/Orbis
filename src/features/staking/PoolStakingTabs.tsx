'use client';

import Image from 'next/image';
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
        <TabsTrigger value="validators" disabled={pending}>Validators</TabsTrigger>
        <TabsTrigger value="positions" disabled={pending}>My Staking</TabsTrigger>
      </TabsList>
      <TabsContent value="validators" className="mt-4 space-y-6">{selection}</TabsContent>
      <TabsContent value="positions" className="mt-4 space-y-6">
        {connected ? positions : <div className="flex flex-col items-center justify-center py-16 gap-4"><Image src="/empty.svg" alt="Connect wallet" width={100} height={100} /><p className="text-muted-foreground">Connect your wallet to view your staking</p></div>}
      </TabsContent>
    </Tabs>
  );
}
