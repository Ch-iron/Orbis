'use client';

import { useWalletInfo } from '@/hooks/useWalletInfo';
import { PortfolioSummaryCards } from './PortfolioSummaryCards';
import { StakingChart } from './StakingChart';
import { TokenPriceChart } from './TokenPriceChart';
import { DelegationList } from './DelegationList';
import Image from 'next/image';
import { useChainStore } from '@/stores/chainStore';
import { PolygonStakingView } from '@/features/polygon-staking/PolygonStakingView';
import { IotexStakingView } from '@/features/iotex-staking/IotexStakingView';
import { AvalancheStakingView } from '@/features/avalanche-staking/AvalancheStakingView';
import { CardanoStakingView } from '@/features/cardano-staking/CardanoStakingView';
import { VechainStakingView } from '@/features/vechain-staking/VechainStakingView';
import { TonStakingView } from '@/features/ton-staking/TonStakingView';
import { MultiversxStakingView } from '@/features/multiversx-staking/MultiversxStakingView';
import { NearStakingView } from '@/features/near-staking/NearStakingView';
import { AptosStakingView } from '@/features/aptos-staking/AptosStakingView';
import { SuiStakingView } from '@/features/sui-staking/SuiStakingView';
import { IotaStakingView } from '@/features/iota-staking/IotaStakingView';
import { SonicStakingView } from '@/features/sonic-staking/SonicStakingView';
import { RetiStakingView } from '@/features/algorand-staking/RetiStakingView';
import { EthereumStakingView } from '@/features/ethereum-staking/EthereumStakingView';
import { NativeCosmosStakingView } from '@/features/native-cosmos/NativeCosmosStakingView';
import { CHAIN_REGISTRY } from '@/lib/chains/registry';

const PortfolioView = () => {
  const { isConnected } = useWalletInfo();
  const slug = useChainStore((state) => state.selectedChainSlug);
  if (slug === 'polygon') return <PolygonStakingView />;
  if (slug === 'iotex') return <IotexStakingView />;
  if (slug === 'avalanche') return <AvalancheStakingView />;
  if (slug === 'cardano') return <CardanoStakingView />;
  if (slug === 'vechain') return <VechainStakingView />;
  if (slug === 'ton') return <TonStakingView />;
  if (slug === 'multiversx') return <MultiversxStakingView />;
  if (slug === 'near') return <NearStakingView />;
  if (slug === 'aptos') return <AptosStakingView />;
  if (slug === 'sui') return <SuiStakingView />;
  if (slug === 'iota') return <IotaStakingView />;
  if (slug === 'sonic') return <SonicStakingView />;
  if (slug === 'algorand') return <RetiStakingView />;
  if (slug === 'ethereum') return <EthereumStakingView />;
  if (slug === 'celestia' || slug === 'dydx') return <NativeCosmosStakingView config={CHAIN_REGISTRY[slug]} />;

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
