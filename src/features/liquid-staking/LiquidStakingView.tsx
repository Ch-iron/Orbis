'use client';
import { XoxnoStakingView } from '@/features/multiversx-liquid-staking/XoxnoStakingView';
import { StpolStakingView } from '@/features/polygon-liquid-staking/StpolStakingView';
import { LairStakingView } from '@/features/kaia-liquid-staking/LairStakingView';
import { EthereumStakingView } from '@/features/ethereum-staking/EthereumStakingView';
import { LinearStakingView } from '@/features/near-liquid-staking/LinearStakingView';
import { HaedalStakingView } from '@/features/sui-liquid-staking/HaedalStakingView';
import { BeetsStakingView } from '@/features/sonic-liquid-staking/BeetsStakingView';
import { TonstakersStakingView } from '@/features/ton-liquid-staking/TonstakersStakingView';
import { BedrockStakingView } from '@/features/iotex-liquid-staking/BedrockStakingView';
import { AmnisStakingView } from '@/features/aptos-liquid-staking/AmnisStakingView';
import { BenqiStakingView } from '@/features/avalanche-liquid-staking/BenqiStakingView';
import { SwirlStakingView } from '@/features/iota-liquid-staking/SwirlStakingView';
import { XAlgoStakingView } from '@/features/algorand-liquid-staking/XAlgoStakingView';

export function LiquidStakingView({ chainId }: { chainId: string }) {
  if (chainId === 'multiversx') return <XoxnoStakingView />;
  if (chainId === 'polygon') return <StpolStakingView />;
  if (chainId === 'kaia') return <LairStakingView />;
  if (chainId === 'ethereum') return <EthereumStakingView />;
  if (chainId === 'algorand') return <XAlgoStakingView />;
  if (chainId === 'iota') return <SwirlStakingView />;
  if (chainId === 'avalanche') return <BenqiStakingView />;
  if (chainId === 'aptos') return <AmnisStakingView />;
  if (chainId === 'iotex') return <BedrockStakingView />;
  if (chainId === 'ton') return <TonstakersStakingView />;
  if (chainId === 'sonic') return <BeetsStakingView />;
  if (chainId === 'sui') return <HaedalStakingView />;
  if (chainId === 'near') return <LinearStakingView />;
  return <p>No integrated liquid staking provider is available for this chain.</p>;
}
