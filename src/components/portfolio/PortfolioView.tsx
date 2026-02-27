'use client';

import { useWalletInfo } from '@/hooks/useWalletInfo';
import { PortfolioSummaryCards } from './PortfolioSummaryCards';
import { StakingChart } from './StakingChart';
import { ChainBreakdown } from './ChainBreakdown';
import { DelegationList } from './DelegationList';
import Image from 'next/image';

const PortfolioView = () => {
  const { isConnected } = useWalletInfo();

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="relative">
          <Image src="/leaf.svg" alt="" width={24} height={24} className="absolute -top-2 -left-4 w-6 h-6 opacity-40 -rotate-45" />
          <Image src="/acorn.svg" alt="" width={20} height={20} className="absolute -top-1 -right-3 w-5 h-5 opacity-40 rotate-12" />
          <Image src="/leaf.svg" alt="" width={20} height={20} className="absolute -bottom-2 -right-5 w-5 h-5 opacity-30 rotate-90" />
          <Image src="/mascot-empty.svg" alt="Connect wallet" width={120} height={120} />
        </div>
        <h2 className="text-2xl font-semibold">Connect Your Wallet</h2>
        <p className="text-muted-foreground">
          Connect your wallet to start collecting acorns!
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Portfolio</h1>
      <PortfolioSummaryCards />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <StakingChart />
        </div>
        <ChainBreakdown />
      </div>
      <DelegationList />
    </div>
  );
};

export { PortfolioView };
