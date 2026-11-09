import { fetchTonApi } from './transport';
import { Address } from '@ton/core';
import { parse } from 'lossless-json';
export type TonPool = { address: string; name: string; implementation: string; apy: number; min_stake: number | bigint; cycle_end: number; current_nominators: number; max_nominators: number };
type StackItem = { type: string; num?: string };
async function tonApi<T>(path: string): Promise<T> {
  const response = await fetchTonApi(path);
  if (!response.ok) throw new Error(`TON 조회 실패 (${response.status})`);
  return parse(await response.text(), undefined, (value) => {
    const number = Number(value);
    return /^-?\d+$/.test(value) && !Number.isSafeInteger(number) ? BigInt(value) : number;
  }) as T;
}
export const tonAddress = (address: string) => Address.parse(address).toRawString();
export async function readTonPools() {
  const { pools } = await tonApi<{ pools: TonPool[] }>('/staking/pools');
  if (!Array.isArray(pools)) throw new Error('TON 풀 목록 응답이 올바르지 않습니다.');
  return pools.filter((pool) => pool.implementation === 'tf');
}
async function runMethod(pool: string, method: string, args = '') {
  return tonApi<{ success: boolean; exit_code: number; stack: StackItem[] }>(`/blockchain/accounts/${encodeURIComponent(tonAddress(pool))}/methods/${method}${args ? `?args=${encodeURIComponent(args)}` : ''}`);
}
function integer(item: StackItem) {
  if (item?.type !== 'num' || typeof item.num !== 'string') throw new Error('TON 계약 정수 응답이 올바르지 않습니다.');
  return item.num.startsWith('-') ? -BigInt(item.num.slice(1)) : BigInt(item.num);
}
export async function readTonPool(pool: string) {
  const result = await runMethod(pool, 'get_pool_data');
  if (!result.success || result.exit_code !== 0 || result.stack.length < 17) throw new Error('표준 TON nominator-pool 설정을 조회할 수 없습니다.');
  const stack = result.stack;
  return { state: integer(stack[0]), count: integer(stack[1]), validatorBalance: integer(stack[3]), commission: Number(integer(stack[5])) / 10000, capacity: integer(stack[6]), minValidatorStake: integer(stack[7]), minStake: integer(stack[8]) };
}
export async function readTonPosition(pool: string, owner: string) {
  const address = Address.parse(owner);
  if (address.workChain !== 0) throw new Error('표준 TON nominator-pool은 기본 워크체인 계정만 지원합니다.');
  const result = await runMethod(pool, 'get_nominator_data', `0x${address.hash.toString('hex')}`);
  if (result.exit_code === 86) return { pool: tonAddress(pool), active: BigInt(0), pending: BigInt(0), withdrawing: false };
  if (!result.success || result.exit_code !== 0 || result.stack.length !== 3) throw new Error('TON 예치 잔액을 조회할 수 없습니다.');
  return { pool: tonAddress(pool), active: integer(result.stack[0]), pending: integer(result.stack[1]), withdrawing: integer(result.stack[2]) === BigInt(-1) };
}
export async function readTonPositions(owner: string) {
  const [{ pools }, supported] = await Promise.all([
    tonApi<{ pools: Array<{ pool: string }> }>(`/staking/nominator/${encodeURIComponent(tonAddress(owner))}/pools`), readTonPools(),
  ]);
  if (!Array.isArray(pools)) throw new Error('TON 예치 목록 응답이 올바르지 않습니다.');
  const known = new Set(supported.map((pool) => tonAddress(pool.address)));
  return Promise.all(pools.filter((pool) => known.has(tonAddress(pool.pool))).map((pool) => readTonPosition(pool.pool, owner)));
}
export async function readTonBalance(owner: string) {
  const result = await tonApi<{ balance: number | bigint }>(`/blockchain/accounts/${encodeURIComponent(tonAddress(owner))}`);
  if (typeof result.balance !== 'bigint' && !Number.isSafeInteger(result.balance)) throw new Error('TON 잔액 응답이 올바르지 않습니다.');
  return BigInt(result.balance);
}
