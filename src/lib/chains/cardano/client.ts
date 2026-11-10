import { KoiosProvider } from '@meshsdk/core';
export const cardanoProvider = new KoiosProvider('api');
export type CardanoPool = { pool_id_bech32: string; ticker: string | null; margin: number; fixed_cost: string; pool_status: string; retiring_epoch: number | null; active_stake: string };
export type CardanoAccount = { stake_address: string; status: string; delegated_pool: string | null; delegated_drep: string | null; total_balance: string; utxo: string; rewards_available: string; deposit: string | null };
async function koios<T>(path: string, body?: object): Promise<T[]> {
  const response = await fetch(`https://api.koios.rest/api/v1${path}`, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : undefined);
  if (!response.ok) throw new Error(`Cardano request failed (${response.status})`);
  const result: T[] = await response.json();
  if (!Array.isArray(result)) throw new Error('Invalid Cardano API response.');
  return result;
}
export async function readCardanoPools() {
  const pools: CardanoPool[] = [];
  for (let offset = 0; ; offset += 1000) {
    const page = await koios<CardanoPool>(`/pool_list?limit=1000&offset=${offset}&order=pool_id_bech32`);
    pools.push(...page);
    if (page.length < 1000) return pools;
  }
}
export async function readCardanoPool(pool: string) {
  const rows = await koios<CardanoPool>('/pool_info', { _pool_bech32_ids: [pool] });
  if (rows.length !== 1) throw new Error('Cardano pool not found.');
  return rows[0];
}
export async function readCardanoAccount(stake: string) {
  if (!stake.startsWith('stake1')) throw new Error('A Cardano mainnet stake address is required.');
  const rows = await koios<CardanoAccount>('/account_info', { _stake_addresses: [stake] });
  if (rows.length > 1) throw new Error('Invalid Cardano account response.');
  return rows[0] ?? null;
}
export async function readCardanoPoolHistory(pool: string) {
  return koios<{ epoch_no: number; epoch_ros: number; margin: number; fixed_cost: string }>(`/pool_history?_pool_bech32=${encodeURIComponent(pool)}&limit=6`);
}
export async function readCardanoReceipt(hash: string) {
  const rows = await koios<{ tx_hash: string; valid_contract: boolean }>('/tx_info', { _tx_hashes: [hash] });
  if (!rows.length) return 'pending' as const;
  if (rows.length !== 1 || rows[0].tx_hash !== hash) throw new Error('Invalid Cardano transaction lookup response.');
  return rows[0].valid_contract ? 'success' as const : 'failed' as const;
}
export async function readCardanoCostModels() {
  const response = await fetch('https://api.koios.rest/api/v1/cli_protocol_params');
  if (!response.ok) throw new Error(`Cardano cost model request failed (${response.status})`);
  const data: { costModels: Record<string, number[]> } = await response.json();
  const models = ['PlutusV1', 'PlutusV2', 'PlutusV3'].map((version) => data.costModels[version]);
  if (models.some((model) => !Array.isArray(model) || !model.length || !model.every(Number.isSafeInteger))) throw new Error('Invalid Cardano cost model response.');
  return models;
}
