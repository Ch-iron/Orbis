export type RetiValidator = {
  id: bigint;
  owner: string;
  nfdId: bigint;
  minimum: bigint;
  commission: number;
  gatingType: number;
  rewardTokenId: bigint;
  sunsettingOn: bigint;
  pools: Array<{ appId: bigint; balance: bigint; stakers: bigint }>;
};

export function decodeValidator(value: unknown): RetiValidator {
  const root = record(value);
  const config = record(root.config);
  const pools = array(root.pools).map((item) => {
    const tuple = array(item);
    return { appId: integer(tuple[0]), stakers: integer(tuple[1]), balance: integer(tuple[2]) };
  }).filter((pool) => pool.appId > BigInt(0));
  if (typeof config.owner !== 'string') throw new Error('Invalid Réti owner address.');
  return {
    id: integer(config.id), owner: config.owner, nfdId: integer(config.nfdForInfo),
    minimum: integer(config.minEntryStake), commission: Number(integer(config.percentToValidator)) / 1_000_000,
    gatingType: Number(integer(config.entryGatingType)), rewardTokenId: integer(config.rewardTokenId),
    sunsettingOn: integer(config.sunsettingOn), pools,
  };
}

export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid Réti response object.');
  return value as Record<string, unknown>;
}

export function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error('Invalid Réti response array.');
  return value;
}

export function integer(value: unknown): bigint {
  if (typeof value === 'bigint' && value >= BigInt(0)) return value;
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return BigInt(value);
  throw new Error('Invalid Réti integer.');
}
