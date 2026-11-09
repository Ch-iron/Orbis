import type { Validator } from '@/lib/chains/types';

const getValidatorYield = (
  chainSlug: string,
  validator: Pick<Validator, 'apy' | 'commission'>,
  networkRate: number | null,
): number | null => {
  if (chainSlug !== 'sei') {
    return isValidRate(validator.apy) ? validator.apy : null;
  }

  if (!isValidRate(networkRate) || !isValidRate(validator.commission) || validator.commission > 1) {
    return null;
  }

  // The existing Sei network rate excludes compounding; commission does not turn it into APY.
  return networkRate * (1 - validator.commission);
};

const compareValidatorYields = (
  rateA: number | null,
  rateB: number | null,
  direction: 'asc' | 'desc',
): number => {
  if (rateA === rateB) return 0;
  if (rateA === null) return 1;
  if (rateB === null) return -1;
  return (rateA - rateB) * (direction === 'asc' ? 1 : -1);
};

const isValidRate = (rate: number | null | undefined): rate is number =>
  typeof rate === 'number' && Number.isFinite(rate) && rate >= 0;

export { getValidatorYield, compareValidatorYields };
