import { iotaClient } from '@/lib/chains/iota/client';

export const SWIRL_PACKAGE = '0xa38a034356187b52c603282198fc831f0f710e16a61b141986697372ef16b292';
export const SWIRL_POOL = '0x02d641d7b021b1cd7a2c361ac35b415ae8263be0641f9475ec32af4b9d8a8056';
export const SWIRL_METADATA = '0x8c25ec843c12fbfddc7e25d66869f8639e20021758cac1a3db0f6de3c9fda2ed';
const STIOTA = '0x346778989a9f57480ec3fee15f2cd68409c73a62112d40a3efd13987997be68c::cert::CERT';

export async function readSwirlPosition(owner: string) {
  const [native, liquid] = await Promise.all([
    iotaClient.getBalance({ owner }), iotaClient.getBalance({ owner, coinType: STIOTA }),
  ]);
  return { available: BigInt(native.totalBalance), receipt: BigInt(liquid.totalBalance) };
}

export async function readSwirlCoins(owner: string) {
  const coins = [];
  let cursor: string | null | undefined;
  const seen = new Set<string>();
  do {
    const page = await iotaClient.getCoins({ owner, coinType: STIOTA, limit: 50, cursor });
    coins.push(...page.data);
    cursor = page.hasNextPage ? page.nextCursor : null;
    if (page.hasNextPage && (!cursor || seen.has(cursor))) throw new Error('Invalid stIOTA coin pagination.');
    if (cursor) seen.add(cursor);
  } while (cursor);
  return coins;
}
