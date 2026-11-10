import { AccountAddress, Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';
import type { Validator } from '../types';

export const aptosClient = new Aptos(new AptosConfig({ network: Network.MAINNET }));
export const aptosAddress = (address: string) => AccountAddress.fromString(address).toStringLong();
type PoolRow = { staking_pool_address: string; operator_commission_percentage: string | number; total_coins: string | number };

async function indexerRows<T>(table: string, fields: string, where = ''): Promise<T[]> {
  const all: T[] = [];
  for (let offset = 0; ; offset += 100) {
    const result = await aptosClient.queryIndexer<Record<string, T[]>>({ query: { query: `query { ${table}(limit:100, offset:${offset}, ${where}) { ${fields} } }` } });
    const rows = result[table];
    if (!Array.isArray(rows)) throw new Error('Could not verify the Aptos indexer response.');
    all.push(...rows);
    if (rows.length < 100) return all;
  }
}

export async function readAptosValidators(): Promise<Validator[]> {
  const [rows, set] = await Promise.all([
    indexerRows<PoolRow>('current_delegated_staking_pool_balances', 'staking_pool_address operator_commission_percentage total_coins'),
    aptosClient.getAccountResource<{ active_validators: Array<{ addr: string }> }>({ accountAddress: '0x1', resourceType: '0x1::stake::ValidatorSet' }),
  ]);
  const active = new Set(set.active_validators.map((item) => aptosAddress(item.addr)));
  return rows.map((row) => {
    const address = aptosAddress(row.staking_pool_address);
    const commission = Number(row.operator_commission_percentage) / 10000;
    if (!Number.isFinite(commission) || commission < 0 || commission > 1) throw new Error('Invalid pool commission response.');
    return { address, name: `${address.slice(0, 10)}…${address.slice(-6)}`, logo: null, commission, votingPower: String(row.total_coins), status: active.has(address) ? 'active' : 'inactive', description: 'Aptos delegation pool' };
  });
}

export async function readAptosStake(pool: string, owner: string) {
  const values = await aptosClient.view({ payload: { function: '0x1::delegation_pool::get_stake', functionArguments: [pool, owner] } });
  if (values.length !== 3 || values.some((value) => typeof value !== 'string' || !/^\d+$/.test(value))) throw new Error('Invalid Aptos staked balance response.');
  const [active, inactive, pending] = values.map((value) => BigInt(String(value)));
  const resource = await aptosClient.getAccountResource<{ locked_until_secs: string }>({ accountAddress: pool, resourceType: '0x1::stake::StakePool' });
  return { pool, active, inactive, pending, unlockAt: new Date(Number(resource.locked_until_secs) * 1000) };
}

export async function readAptosPositions(owner: string) {
  const address = aptosAddress(owner);
  const pools = await indexerRows<{ pool_address: string }>('delegator_distinct_pool', 'pool_address', `where:{delegator_address:{_eq:"${address}"}}`);
  return Promise.all(pools.map((pool) => readAptosStake(pool.pool_address, address)));
}

export async function readAptosApr() {
  const [rate, block] = await Promise.all([
    aptosClient.view({ payload: { function: '0x1::staking_config::reward_rate' } }),
    aptosClient.getAccountResource<{ epoch_interval: string }>({ accountAddress: '0x1', resourceType: '0x1::block::BlockResource' }),
  ]);
  const numerator = Number(rate[0]), denominator = Number(rate[1]), interval = Number(block.epoch_interval);
  if (![numerator, denominator, interval].every(Number.isFinite) || denominator <= 0 || interval <= 0 || numerator < 0) throw new Error('Could not verify the Aptos reward rate.');
  return numerator / denominator * (365 * 86400 * 1000000 / interval);
}

export async function readAptosBalance(owner: string) {
  const [balance] = await aptosClient.view({ payload: { function: '0x1::coin::balance', typeArguments: ['0x1::aptos_coin::AptosCoin'], functionArguments: [owner] } });
  if (typeof balance !== 'string' || !/^\d+$/.test(balance)) throw new Error('Invalid APT balance response.');
  return balance;
}
