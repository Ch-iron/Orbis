import { StakingView } from '@/components/staking/StakingView';

type StakePageProps = {
  params: Promise<{ chainId: string }>;
};

export default async function StakePage({ params }: StakePageProps) {
  const { chainId } = await params;
  return <StakingView chainId={chainId} />;
}
