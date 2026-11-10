import type { SuiClientTypes } from '@mysten/sui/client';
import { suiClient, readSuiState } from '@/lib/chains/sui/client';

export const HAEDAL_PACKAGE = '0x126e4cfb051cad744706df590ec399e8c02b6feae195c35b8b496280d5442a62';
export const HAEDAL_STAKING = '0x47b224762220393057ebf4f70501b6e657c3e56684737568439a04f80849b2ca';
const ORIGINAL_PACKAGE = '0xbde4ba4c2e274a60ce15c1cfff9e5c42e41654ac8b6d906a57efa4bd3c29f47d';
const HASUI = `${ORIGINAL_PACKAGE}::hasui::HASUI`;
const TICKET = `${ORIGINAL_PACKAGE}::staking::UnstakeTicket`;

export async function readHaedalPosition(owner: string) {
  const [native, liquid, state, tickets] = await Promise.all([
    suiClient.core.getBalance({ owner }),
    suiClient.core.getBalance({ owner, coinType: HASUI }),
    readSuiState(), readTickets(owner),
  ]);
  return { available: BigInt(native.balance.balance), receipt: BigInt(liquid.balance.balance), epoch: state.epoch!, tickets };
}

export async function readHaedalCoins(owner: string) {
  const coins = [];
  let cursor: string | null = null;
  const seen = new Set<string>();
  do {
    const page = await suiClient.core.listCoins({ owner, coinType: HASUI, limit: 50, cursor });
    coins.push(...page.objects);
    cursor = page.hasNextPage ? page.cursor : null;
    if (page.hasNextPage && (!cursor || seen.has(cursor))) throw new Error('Invalid haSUI coin pagination.');
    if (cursor) seen.add(cursor);
  } while (cursor);
  return coins;
}

async function readTickets(owner: string) {
  const tickets = [];
  let cursor: string | null = null;
  const seen = new Set<string>();
  do {
    const page: SuiClientTypes.ListOwnedObjectsResponse<{ json: true }> = await suiClient.core.listOwnedObjects({ owner, type: TICKET, include: { json: true }, limit: 50, cursor });
    for (const item of page.objects) {
      const fields = item.json;
      if (!fields || typeof fields.claim_epoch !== 'string' || typeof fields.sui_amount !== 'string') throw new Error('Invalid Haedal withdrawal ticket.');
      tickets.push({ objectId: item.objectId, claimEpoch: BigInt(fields.claim_epoch), amount: BigInt(fields.sui_amount) });
    }
    cursor = page.hasNextPage ? page.cursor : null;
    if (page.hasNextPage && (!cursor || seen.has(cursor))) throw new Error('Invalid Haedal ticket pagination.');
    if (cursor) seen.add(cursor);
  } while (cursor);
  return tickets;
}
