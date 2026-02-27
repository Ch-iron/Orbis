import { useQuery } from '@tanstack/react-query';

const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3/simple/price';

type TokenPriceData = {
  price: number | null;
  change24h: number | null;
};

const fetchTokenPrice = async (coingeckoId: string): Promise<TokenPriceData> => {
  const url = `${COINGECKO_API_URL}?ids=${coingeckoId}&vs_currencies=usd&include_24hr_change=true`;
  const response = await fetch(url).catch(() => null);

  if (!response?.ok) {
    return { price: null, change24h: null };
  }

  const data = await response.json();
  const tokenData = data[coingeckoId];

  return {
    price: tokenData?.usd ?? null,
    change24h: tokenData?.usd_24h_change ?? null,
  };
};

const useTokenPrice = (coingeckoId: string | undefined) => {
  const { data, isLoading } = useQuery({
    queryKey: ['tokenPrice', coingeckoId],
    queryFn: () => fetchTokenPrice(coingeckoId!),
    enabled: !!coingeckoId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    price: data?.price ?? null,
    change24h: data?.change24h ?? null,
    isLoading,
  };
};

export { useTokenPrice };
