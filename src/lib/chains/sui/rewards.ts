export type ExchangeRate = { sui: bigint; pool: bigint };

export function estimateSuiRewards(principal: bigint, initial: ExchangeRate, current: ExchangeRate) {
  if (initial.sui <= BigInt(0) || initial.pool <= BigInt(0) || current.sui <= BigInt(0) || current.pool <= BigInt(0)) throw new Error('Invalid Sui reward exchange rate.');
  const poolTokens = principal * initial.pool / initial.sui;
  const value = poolTokens * current.sui / current.pool;
  return value > principal ? value - principal : BigInt(0);
}

export function estimateSuiApy(initial: ExchangeRate, current: ExchangeRate, elapsedMs: number) {
  if (elapsedMs <= 0 || initial.sui <= BigInt(0) || initial.pool <= BigInt(0) || current.pool <= BigInt(0)) throw new Error('Invalid Sui yield calculation period or exchange rate.');
  const growth = Number(current.sui) / Number(current.pool) / (Number(initial.sui) / Number(initial.pool));
  const apy = growth ** (365 * 86400000 / elapsedMs) - 1;
  if (!Number.isFinite(apy)) throw new Error('Could not calculate the Sui yield rate.');
  return apy;
}
