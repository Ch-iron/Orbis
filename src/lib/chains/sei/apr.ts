import type { ChainConfig } from '../types';

const MILLISECONDS_PER_DAY = 86_400_000;

type MinterResponse = {
  start_date?: string;
  end_date?: string;
  total_mint_amount?: string;
};
type PoolResponse = { pool?: { bonded_tokens?: string } };
type DistributionResponse = { params?: { community_tax?: string } };

const fetchSeiApr = async (config: Pick<ChainConfig, 'lcd'>): Promise<number> => {
  const paths = [
    '/seichain/mint/v1beta1/minter',
    '/cosmos/staking/v1beta1/pool',
    '/cosmos/distribution/v1beta1/params',
  ];
  const responses = await Promise.all(paths.map((path) => fetch(`${config.lcd}${path}`)));
  if (responses.some((response) => !response.ok)) {
    throw new Error('Failed to fetch Sei staking APR data');
  }

  const [minter, pool, distribution]: [MinterResponse | null, PoolResponse | null, DistributionResponse | null] =
    await Promise.all([responses[0].json(), responses[1].json(), responses[2].json()]);
  const start = typeof minter?.start_date === 'string' ? Date.parse(minter.start_date) : NaN;
  const end = typeof minter?.end_date === 'string' ? Date.parse(minter.end_date) : NaN;
  const days = (end - start) / MILLISECONDS_PER_DAY;
  const totalMint = parseNonNegativeNumber(minter?.total_mint_amount);
  const bondedTokens = parseNonNegativeNumber(pool?.pool?.bonded_tokens);
  const communityTax = parseNonNegativeNumber(distribution?.params?.community_tax);

  if (!Number.isFinite(days) || days <= 0 || communityTax > 1) {
    throw new Error('Invalid Sei staking APR data');
  }
  if (bondedTokens === 0) return 0;

  // Match dashboard.sei.io: current mint period, exclusive day count, and community tax.
  const apr = totalMint / days * 365 * (1 - communityTax) / bondedTokens;
  if (!Number.isFinite(apr)) throw new Error('Invalid Sei staking APR result');
  return apr;
};

const parseNonNegativeNumber = (value: unknown): number => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error('Missing Sei staking APR value');
  }
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) throw new Error('Invalid Sei staking APR value');
  return number;
};

export { fetchSeiApr };
