'use client';

import { useEffect } from 'react';
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
  const setSelectedChainSlug = useChainStore(
    (state) => state.setSelectedChainSlug,
  );
  const { isConnected } = useWalletInfo();

  useEffect(() => {
    setSelectedChainSlug(chainId);
  }, [chainId, setSelectedChainSlug]);

  if (chainId === 'polygon') return <PolygonStakingView />;
  if (chainId === 'iotex') return <IotexStakingView />;
  if (chainId === 'avalanche') return <AvalancheStakingView />;
  if (chainId === 'cardano') return <CardanoStakingView />;
  if (chainId === 'vechain') return <VechainStakingView />;
  if (chainId === 'ton') return <TonStakingView />;
  if (chainId === 'multiversx') return <MultiversxStakingView />;
  if (chainId === 'near') return <NearStakingView />;
  if (chainId === 'aptos') return <AptosStakingView />;
  if (chainId === 'sui') return <SuiStakingView />;
  if (chainId === 'iota') return <IotaStakingView />;
  if (chainId === 'sonic') return <SonicStakingView />;
  if (chainId === 'algorand') return <RetiStakingView />;
  if (chainId === 'ethereum') return <EthereumStakingView />;
  if (chainId === 'celestia' || chainId === 'dydx') return <NativeCosmosStakingView config={CHAIN_REGISTRY[chainId]} />;

  return (
    <div className='flex flex-col gap-6'>
      <h1 className='text-2xl font-bold'>Staking</h1>
      <Tabs defaultValue='validators'>
        <TabsList>
          <TabsTrigger value='validators'>Validators</TabsTrigger>
          <TabsTrigger value='my-staking'>My Staking</TabsTrigger>
        </TabsList>
        <TabsContent value='validators' className='mt-4'>
          <ValidatorTable />
        </TabsContent>
        <TabsContent value='my-staking' className='mt-4'>
          {!isConnected ? (
            <div className='flex flex-col items-center justify-center py-16 gap-4'>
              <Image
                src='/empty.svg'
                alt='Connect wallet'
                width={100}
                height={100}
              />
              <p className='text-muted-foreground'>
                Connect your wallet to view your staking
              </p>
            </div>
          ) : (
            <div className='flex flex-col gap-6'>
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
