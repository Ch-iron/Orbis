export const NEAR_RPC = 'https://rpc.mainnet.near.org';
export function assertNearAccount(address: string) {
  if (!/^[a-z0-9]+(?:[-_.][a-z0-9]+)*$/.test(address) || address.length < 2 || address.length > 64) throw new Error('NEAR 계정 ID가 올바르지 않습니다.');
}
export async function nearRpc<T>(method: string, params: unknown): Promise<T> {
  const response = await fetch(NEAR_RPC, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 'orbis', method, params }) });
  if (!response.ok) throw new Error(`NEAR 노드 조회 실패 (${response.status})`);
  const body = await response.json();
  if (body.error || body.result === undefined) throw new Error(body.error?.message ?? 'NEAR 응답을 확인할 수 없습니다.');
  return body.result;
}
export async function nearView<T>(pool: string, method: string, args: Record<string, unknown> = {}): Promise<T> {
  assertNearAccount(pool);
  const bytes = new TextEncoder().encode(JSON.stringify(args));
  const result = await nearRpc<{ result?: number[]; error?: string }>('query', { request_type: 'call_function', finality: 'final', account_id: pool, method_name: method, args_base64: btoa(String.fromCharCode(...bytes)) });
  if (!Array.isArray(result.result)) throw new Error(result.error ?? 'NEAR 풀 조회에 실패했습니다.');
  return JSON.parse(new TextDecoder().decode(new Uint8Array(result.result)));
}
type NearValidator = { account_id: string; stake: string; is_slashed: boolean };
export async function readNearValidators() {
  const result = await nearRpc<{ current_validators: NearValidator[] }>('validators', [null]);
  if (!Array.isArray(result.current_validators)) throw new Error('NEAR 검증자 목록 응답이 올바르지 않습니다.');
  return result.current_validators;
}
export async function readNearPool(pool: string) {
  const [fee, paused] = await Promise.all([nearView<{ numerator: number; denominator: number }>(pool, 'get_reward_fee_fraction'), nearView<boolean>(pool, 'is_staking_paused')]);
  const commission = fee.numerator / fee.denominator;
  if (!Number.isFinite(commission) || commission < 0 || commission > 1 || typeof paused !== 'boolean') throw new Error('NEAR 풀 설정 응답이 올바르지 않습니다.');
  return { commission, paused };
}
export async function readNearPosition(pool: string, owner: string) {
  assertNearAccount(owner);
  const account = await nearView<{ staked_balance: string; unstaked_balance: string; can_withdraw: boolean }>(pool, 'get_account', { account_id: owner });
  if (!/^\d+$/.test(account.staked_balance) || !/^\d+$/.test(account.unstaked_balance) || typeof account.can_withdraw !== 'boolean') throw new Error('NEAR 예치 잔액 응답이 올바르지 않습니다.');
  return { pool, staked: BigInt(account.staked_balance), unstaked: BigInt(account.unstaked_balance), canWithdraw: account.can_withdraw };
}
export async function readNearPositions(owner: string) {
  assertNearAccount(owner);
  const response = await fetch(`https://api.fastnear.com/v1/account/${encodeURIComponent(owner)}/staking`);
  if (!response.ok) throw new Error(`NEAR 예치 풀 검색 실패 (${response.status})`);
  const data: { pools?: Array<{ pool_id: string }> } = await response.json();
  if (!Array.isArray(data.pools)) throw new Error('NEAR 예치 풀 검색 응답이 올바르지 않습니다.');
  return Promise.all(data.pools.map((pool) => readNearPosition(pool.pool_id, owner)));
}
export async function readNearBalance(owner: string) {
  assertNearAccount(owner);
  const [account, config] = await Promise.all([
    nearRpc<{ amount: string; storage_usage: number }>('query', { request_type: 'view_account', finality: 'final', account_id: owner }),
    nearRpc<{ runtime_config: { storage_amount_per_byte: string } }>('EXPERIMENTAL_protocol_config', { finality: 'final' }),
  ]);
  const available = BigInt(account.amount) - BigInt(account.storage_usage) * BigInt(config.runtime_config.storage_amount_per_byte);
  return available > BigInt(0) ? available.toString() : '0';
}
export async function readNearApr() {
  const [config, block, validators] = await Promise.all([
    nearRpc<{ max_inflation_rate: [number, number]; protocol_reward_rate: [number, number] }>('EXPERIMENTAL_protocol_config', { finality: 'final' }),
    nearRpc<{ header: { total_supply: string } }>('block', { finality: 'final' }), readNearValidators(),
  ]);
  const stake = validators.reduce((sum, item) => sum + BigInt(item.stake), BigInt(0));
  const apr = Number(block.header.total_supply) / Number(stake) * (config.max_inflation_rate[0] / config.max_inflation_rate[1]) * (1 - config.protocol_reward_rate[0] / config.protocol_reward_rate[1]);
  if (!Number.isFinite(apr) || apr < 0) throw new Error('NEAR 보상률을 계산할 수 없습니다.');
  return apr;
}
