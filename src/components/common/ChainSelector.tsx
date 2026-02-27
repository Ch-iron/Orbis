'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useChainStore } from '@/stores/chainStore';
import { CHAIN_REGISTRY } from '@/lib/chains/registry';
import { useTokenPrice } from '@/hooks/useTokenPrice';

const CHAIN_OPTIONS = Object.values(CHAIN_REGISTRY);

const formatPrice = (price: number): string => {
  if (price >= 1) {
    return `$${price.toFixed(2)}`;
  }
  return `$${price.toFixed(4)}`;
};

const formatChange = (change: number): string => {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}%`;
};

const TokenInfo = () => {
  const selectedChainSlug = useChainStore((state) => state.selectedChainSlug);
  const chain = CHAIN_REGISTRY[selectedChainSlug];
  const { price, change24h, isLoading } = useTokenPrice(chain?.stakingToken.coingeckoId);

  if (!chain?.stakingToken.coingeckoId || isLoading || price === null) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Image
        src={chain.logo}
        alt={chain.stakingToken.symbol}
        width={20}
        height={20}
        className="rounded-full"
      />
      <span className="text-sm font-medium">
        {chain.stakingToken.symbol}
      </span>
      <span className="text-sm">
        {formatPrice(price)}
      </span>
      {change24h !== null && (
        <span className={`text-xs font-medium ${change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          {formatChange(change24h)}
        </span>
      )}
    </div>
  );
};

const ChainSelector = () => {
  const selectedChainSlug = useChainStore((state) => state.selectedChainSlug);
  const setSelectedChainSlug = useChainStore((state) => state.setSelectedChainSlug);
  const router = useRouter();

  const handleChainChange = (slug: string) => {
    setSelectedChainSlug(slug);
    router.push(`/stake/${slug}`);
  };

  return (
    <div className="flex items-center gap-3">
      <Select value={selectedChainSlug} onValueChange={handleChainChange}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Select chain" />
        </SelectTrigger>
        <SelectContent>
          {CHAIN_OPTIONS.map((chain) => (
            <SelectItem key={chain.slug} value={chain.slug}>
              {chain.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <TokenInfo />
    </div>
  );
};

export { ChainSelector };
