import { aptosClient, aptosAddress, readAptosBalance } from '@/lib/chains/aptos/client';

export const AMNIS = '0x111ae3e5bc816a5e63c2da97d0aa3886519e0cd5e4b046659fa35796bd11542a';

export async function readAmnisPosition(owner: string) {
  const [available, receipt, amapt, rate, collection, ledger] = await Promise.all([
    readAptosBalance(owner), readCoin(owner, `${AMNIS}::stapt_token::StakedApt`), readCoin(owner, `${AMNIS}::amapt_token::AmnisApt`),
    aptosClient.view({ payload: { function: `${AMNIS}::stapt_token::stapt_price` } }),
    aptosClient.view({ payload: { function: `${AMNIS}::withdrawal::collection_address` } }),
    aptosClient.getLedgerInfo(),
  ]);
  if (typeof collection[0] !== 'string') throw new Error('Invalid Amnis withdrawal collection.');
  const tickets = [];
  for (let offset = 0; ; offset += 100) {
    const page = await aptosClient.getAccountOwnedTokensFromCollectionAddress({ accountAddress: owner, collectionAddress: aptosAddress(collection[0]), options: { limit: 100, offset, tokenStandard: 'v2' } });
    const batch = await Promise.all(page.map(async (token) => {
      const address = aptosAddress(token.token_data_id);
      const resource = await aptosClient.getAccountResource<{ locked_until_secs: string; amapt: { value: string } }>({ accountAddress: address, resourceType: `${AMNIS}::withdrawal::WithdrawalToken` });
      return { address, unlock: integer(resource.locked_until_secs), amount: integer(resource.amapt.value) };
    }));
    tickets.push(...batch);
    if (page.length < 100) break;
  }
  return { available: integer(available), receipt, amapt, rate: integer(rate[0]), timestamp: integer(ledger.ledger_timestamp) / BigInt(1_000_000), tickets };
}

async function readCoin(owner: string, coin: string) {
  const values = await aptosClient.view({ payload: { function: '0x1::coin::balance', typeArguments: [coin], functionArguments: [owner] } });
  return integer(values[0]);
}

function integer(value: unknown) {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) throw new Error('Invalid Amnis integer response.');
  return BigInt(value);
}
