'use client';

import { useEffect } from 'react';
import { useChainStore } from '@/stores/chainStore';
import { useWalletInfo } from '@/hooks/useWalletInfo';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ValidatorTable } from './ValidatorTable';
import { StakingDelegationList } from './StakingDelegationList';
import { UnbondingList } from './UnbondingList';
import Image from 'next/image';

type StakingViewProps = {
  chainId: string;
};

const StakingView = ({ chainId }: StakingViewProps) => {
  const setSelectedChainSlug = useChainStore((state) => state.setSelectedChainSlug);
  const { isConnected } = useWalletInfo();

  useEffect(() => {
    setSelectedChainSlug(chainId);
  }, [chainId, setSelectedChainSlug]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Staking</h1>
      <Tabs defaultValue="validators">
        <TabsList>
          <TabsTrigger value="validators">Validators</TabsTrigger>
          <TabsTrigger value="my-staking">My Staking</TabsTrigger>
        </TabsList>
        <TabsContent value="validators" className="mt-4">
          <ValidatorTable />
        </TabsContent>
        <TabsContent value="my-staking" className="mt-4">
          {!isConnected ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="relative">
                <Image src="/leaf.svg" alt="" width={20} height={20} className="absolute -top-2 -left-3 w-5 h-5 opacity-40 -rotate-[30deg]" />
                <Image src="/acorn.svg" alt="" width={20} height={20} className="absolute -bottom-1 -right-3 w-5 h-5 opacity-40 rotate-12" />
                <Image src="/leaf.svg" alt="" width={16} height={16} className="absolute -top-1 -right-4 w-4 h-4 opacity-30 rotate-[70deg]" />
                <Image src="/mascot-empty.svg" alt="Connect wallet" width={100} height={100} />
              </div>
              <p className="text-muted-foreground">Connect your wallet to view your staking</p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <StakingDelegationList />
              <UnbondingList />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export { StakingView };
