'use client';

import { useWalletInfo } from '@/hooks/useWalletInfo';
import { PortfolioSummaryCards } from './PortfolioSummaryCards';
import { StakingChart } from './StakingChart';
import { TokenPriceChart } from './TokenPriceChart';
import { DelegationList } from './DelegationList';
import Image from 'next/image';

const PortfolioView = () => {
  const { isConnected } = useWalletInfo();

  if (!isConnected) {
    return (
      <div className='flex flex-col items-center justify-center min-h-[60vh] gap-4'>
        <Image src='/empty.svg' alt='Connect wallet' width={120} height={120} />
        <h2 className='text-2xl font-semibold'>Connect Your Wallet</h2>
        <p className='text-muted-foreground'>
          Connect your wallet to get started
        </p>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-6'>
      <h1 className='text-2xl font-bold'>Portfolio</h1>
      <PortfolioSummaryCards />
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        <TokenPriceChart />
        <StakingChart />
      </div>
      <DelegationList />
    </div>
  );
};

export { PortfolioView };
