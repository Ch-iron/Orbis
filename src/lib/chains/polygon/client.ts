import { erc20Abi, getAddress, type Address } from 'viem';
import { ethereumClient } from '../ethereum/client';
import { MANAGER_ABI, POL, SHARE_ABI, STAKE_MANAGER } from './contracts';
export { ethereumClient as polygonStakingClient } from '../ethereum/client';
type PolygonValidator = { id: number; name: string; contractAddress: string; commissionPercentage: number; isDelegationEnabled: boolean; totalStake: string; status: string };
type ApiResponse<T> = { success: boolean; result: T; summary?: { total: number } };
async function api<T>(path: string): Promise<ApiResponse<T>> {
  const response = await fetch(`https://staking-api.polygon.technology/api/v3${path}`);
  if (!response.ok) throw new Error(`Polygon 스테이킹 조회 실패 (${response.status})`);
  const data: ApiResponse<T> = await response.json();
  if (!data.success || data.result === undefined) throw new Error('Polygon 스테이킹 응답이 올바르지 않습니다.');
  return data;
}
export async function readPolygonValidators() {
  const validators: PolygonValidator[] = [];
  for (let offset = 0; ; offset += 100) {
    const page = await api<PolygonValidator[]>(`/validators?limit=100&offset=${offset}`);
    if (!Array.isArray(page.result) || !Number.isInteger(page.summary?.total)) throw new Error('Polygon 검증자 페이지 응답이 올바르지 않습니다.');
    validators.push(...page.result);
    if (offset + page.result.length >= page.summary!.total) return validators;
    if (!page.result.length) throw new Error('Polygon 검증자 목록을 끝까지 조회하지 못했습니다.');
  }
}
export async function readPolygonValidator(id: bigint) {
  const [contract, active] = await Promise.all([
    ethereumClient.readContract({ address: STAKE_MANAGER, abi: MANAGER_ABI, functionName: 'getValidatorContract', args: [id] }),
    ethereumClient.readContract({ address: STAKE_MANAGER, abi: MANAGER_ABI, functionName: 'isValidator', args: [id] }),
  ]);
  const delegation = await ethereumClient.readContract({ address: contract, abi: SHARE_ABI, functionName: 'delegation' });
  return { contract, active, delegation };
}
export async function readPolygonPosition(id: bigint, owner: Address) {
  const { contract } = await readPolygonValidator(id);
  const [[amount, rate], rewards] = await Promise.all([
    ethereumClient.readContract({ address: contract, abi: SHARE_ABI, functionName: 'getTotalStake', args: [owner] }),
    ethereumClient.readContract({ address: contract, abi: SHARE_ABI, functionName: 'getLiquidRewards', args: [owner] }),
  ]);
  return { id, contract, amount, rate, rewards };
}
export async function readPolygonPositions(owner: Address) {
  getAddress(owner);
  const ids: number[] = [];
  for (let offset = 0; ; offset += 100) {
    const page = await api<Array<{ bondedValidator: number }>>(`/delegators/${owner}?limit=100&offset=${offset}`);
    if (!Array.isArray(page.result) || !Number.isInteger(page.summary?.total)) throw new Error('Polygon 위임 페이지 응답이 올바르지 않습니다.');
    ids.push(...page.result.map((row) => row.bondedValidator));
    if (offset + page.result.length >= page.summary!.total) break;
    if (!page.result.length) throw new Error('Polygon 위임 목록을 끝까지 조회하지 못했습니다.');
  }
  return Promise.all([...new Set(ids)].map((id) => readPolygonPosition(BigInt(id), owner)));
}
export async function readPolygonWithdrawal(owner: Address, id: bigint, nonce: bigint) {
  const { contract } = await readPolygonValidator(id);
  const [unbond, rate, epoch, delay] = await Promise.all([
    ethereumClient.readContract({ address: contract, abi: SHARE_ABI, functionName: 'unbonds_new', args: [owner, nonce] }),
    ethereumClient.readContract({ address: contract, abi: SHARE_ABI, functionName: 'withdrawExchangeRate' }),
    ethereumClient.readContract({ address: STAKE_MANAGER, abi: MANAGER_ABI, functionName: 'epoch' }),
    ethereumClient.readContract({ address: STAKE_MANAGER, abi: MANAGER_ABI, functionName: 'withdrawalDelay' }),
  ]);
  const amount = unbond[0] * rate / (id < BigInt(8) ? BigInt(100) : BigInt(10) ** BigInt(29));
  return { id, nonce, contract, amount, claimEpoch: unbond[1] + delay, epoch, ready: unbond[0] > BigInt(0) && epoch >= unbond[1] + delay };
}
export async function readPolygonWithdrawals(owner: Address) {
  getAddress(owner);
  const { result } = await api<Array<{ validatorId: number | string; nonce: number | string; completed: boolean }>>(`/delegators/unbonds/${owner}`);
  if (!Array.isArray(result)) throw new Error('Polygon 해제 목록 응답이 올바르지 않습니다.');
  return Promise.all(result.filter((row) => !row.completed).map((row) => readPolygonWithdrawal(owner, BigInt(row.validatorId), BigInt(row.nonce))));
}
export async function readPolygonBalance(owner: Address) {
  return ethereumClient.readContract({ address: POL, abi: erc20Abi, functionName: 'balanceOf', args: [owner] });
}
