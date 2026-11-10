import { tonApi, tonAddress, readTonBalance } from '@/lib/chains/ton/client';

export const TONSTAKERS_POOL = 'EQCkWxfyhAkim3g2DjKQQg8T5P4g-Q1-K_jErGcDJZ4i-vqR';
type JettonBalance = { balance: string; jetton: { address: string }; wallet_address: { address: string } };
type WithdrawalNft = { address: string; owner?: { address: string }; collection?: { address: string } };

export async function readTonstakersPosition(owner: string) {
  const [available, pool, balances, data] = await Promise.all([
    readTonBalance(owner),
    tonApi<{ pool: { liquid_jetton_master?: string; min_stake: number | bigint | string } }>(`/staking/pool/${encodeURIComponent(tonAddress(TONSTAKERS_POOL))}`),
    tonApi<{ balances: JettonBalance[] }>(`/accounts/${encodeURIComponent(tonAddress(owner))}/jettons`),
    tonApi<{ success: boolean; exit_code: number; decoded?: { total_balance: number | bigint | string; supply: number | bigint | string } }>(`/blockchain/accounts/${encodeURIComponent(tonAddress(TONSTAKERS_POOL))}/methods/get_pool_full_data`),
  ]);
  if (!pool.pool.liquid_jetton_master || !Array.isArray(balances.balances) || !data.success || data.exit_code !== 0 || !data.decoded) throw new Error('Invalid Tonstakers pool response.');
  const jetton = balances.balances.find((item) => tonAddress(item.jetton.address) === tonAddress(pool.pool.liquid_jetton_master!));
  const supply = integer(data.decoded.supply);
  if (supply <= BigInt(0)) throw new Error('Tonstakers exchange rate is unavailable.');
  return { available, minimumStake: integer(pool.pool.min_stake), receipt: jetton ? integer(jetton.balance) : BigInt(0), jettonWallet: jetton?.wallet_address.address, rate: integer(data.decoded.total_balance) * BigInt(1_000_000_000) / supply };
}

export async function readTonstakersWithdrawals(owner: string) {
  const response = await fetch('https://api.tonstakers.com/api/v1/pool/withdrawal_payout');
  if (!response.ok) throw new Error('Could not fetch Tonstakers withdrawal rounds.');
  const result: { data: { active_collections: Array<{ withdrawal_payout: string; cycle_end: number }> } } = await response.json();
  if (!Array.isArray(result.data?.active_collections)) throw new Error('Invalid Tonstakers withdrawal rounds.');
  const rounds = new Map(result.data.active_collections.map((round) => [tonAddress(round.withdrawal_payout), round.cycle_end]));
  const requests = [];
  for (let offset = 0; ; offset += 100) {
    const page = await tonApi<{ nft_items: WithdrawalNft[] }>(`/accounts/${encodeURIComponent(tonAddress(owner))}/nfts?limit=100&offset=${offset}&indirect_ownership=false`);
    if (!Array.isArray(page.nft_items)) throw new Error('Invalid TON withdrawal NFT response.');
    for (const nft of page.nft_items) {
      const roundEnd = nft.collection ? rounds.get(tonAddress(nft.collection.address)) : undefined;
      if (roundEnd !== undefined && nft.owner && tonAddress(nft.owner.address) === tonAddress(owner)) requests.push({ address: nft.address, roundEnd });
    }
    if (page.nft_items.length < 100) break;
  }
  return requests;
}

function integer(value: number | bigint | string) {
  if (typeof value === 'number' && !Number.isSafeInteger(value)) throw new Error('Invalid TON integer amount.');
  if (!/^\d+$/.test(String(value))) throw new Error('Invalid TON integer amount.');
  return BigInt(value);
}
