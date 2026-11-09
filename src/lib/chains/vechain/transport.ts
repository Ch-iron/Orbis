import { createPublicClient, custom, type Address, type Hex } from 'viem';
export type VechainClause = { to: Address; data: Hex; value: string };
type Simulation = { data: Hex; reverted: boolean; vmError: string; gasUsed: number };
export async function thorRead<T>(path: string, body?: object): Promise<T> {
  const response = await fetch(`https://mainnet.vechain.org${path}`, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : undefined);
  if (!response.ok) throw new Error(`VeChain 조회 실패 (${response.status})`);
  return response.json();
}
export async function simulateVechainClauses(clauses: VechainClause[], owner?: Address) {
  const results = await thorRead<Simulation[]>('/accounts/*', { clauses, ...(owner ? { caller: owner } : {}) });
  if (!Array.isArray(results) || results.length !== clauses.length) throw new Error('VeChain 시뮬레이션 응답이 올바르지 않습니다.');
  for (const result of results) if (result.reverted || result.vmError) throw new Error(`VeChain 계약 실행 실패: ${result.vmError || 'reverted'}`);
  return results;
}
// Adapt read-only ABI calls to Thor's native simulation endpoint.
export const vechainReadClient = createPublicClient({ transport: custom({ request: async ({ method, params }) => {
  if (method !== 'eth_call' || !Array.isArray(params)) throw new Error('Only read-only contract calls are supported by this Thor transport.');
  const call = params[0] as { to: Address; data: Hex };
  const [result] = await simulateVechainClauses([{ ...call, value: '0' }]);
  return result.data;
} }) });
