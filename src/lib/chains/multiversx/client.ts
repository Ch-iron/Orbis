import { Address } from '@multiversx/sdk-core/out/core/address';
import { ApiNetworkProvider } from '@multiversx/sdk-core/out/networkProviders/apiNetworkProvider';
export const MULTIVERSX_API = 'https://api.multiversx.com';
export const multiversxClient = new ApiNetworkProvider(MULTIVERSX_API);
export type MultiversxProvider = { provider: string; owner: string; identity?: string; serviceFee: number; apr?: number; locked: string; numNodes: number };
async function api<T>(path: string): Promise<T> {
  const response = await fetch(`${MULTIVERSX_API}${path}`);
  if (!response.ok) throw new Error(`MultiversX request failed (${response.status})`);
  return response.json();
}
export async function readMultiversxProviders() {
  const rows = await api<MultiversxProvider[]>('/providers');
  if (!Array.isArray(rows)) throw new Error('Invalid MultiversX provider list response.');
  for (const row of rows) {
    Address.newFromBech32(row.provider);
    if (!Number.isFinite(row.serviceFee) || row.serviceFee < 0 || row.serviceFee > 1 || (row.apr !== undefined && !Number.isFinite(row.apr))) throw new Error('Invalid MultiversX fee or yield rate response.');
  }
  return rows;
}
export async function multiversxView(contract: string, method: string, args: string[]) {
  Address.newFromBech32(contract);
  const response = await fetch(`${MULTIVERSX_API}/vm-values/query`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ scAddress: contract, funcName: method, args }) });
  if (!response.ok) throw new Error(`MultiversX contract request failed (${response.status})`);
  const result = await response.json();
  const data = result.data?.data;
  if (data?.returnCode !== 'ok' || !Array.isArray(data.returnData)) throw new Error(data?.returnMessage || result.error || 'Invalid MultiversX contract response.');
  return data.returnData as string[];
}
function decodeAmount(value: string) {
  if (typeof value !== 'string') throw new Error('Missing MultiversX amount response.');
  const hex = Array.from(atob(value), (character) => character.charCodeAt(0).toString(16).padStart(2, '0')).join('');
  return BigInt(`0x${hex || '0'}`);
}
export async function readMultiversxPosition(contract: string, owner: string) {
  const values = await multiversxView(contract, 'getDelegatorFundsData', [Address.newFromBech32(owner).toHex()]);
  if (values.length !== 4) throw new Error('Invalid MultiversX staking information response.');
  const [active, rewards, unstaked, withdrawable] = values.map(decodeAmount);
  return { contract, active, rewards, unstaked, withdrawable };
}
export async function readMultiversxPositions(owner: string) {
  Address.newFromBech32(owner);
  const rows = await api<Array<{ contract: string }>>(`/accounts/${owner}/delegation`);
  if (!Array.isArray(rows)) throw new Error('Invalid MultiversX staking list response.');
  return Promise.all(rows.map((row) => readMultiversxPosition(row.contract, owner)));
}
export async function readMultiversxBalance(owner: string) {
  return (await multiversxClient.getAccount(Address.newFromBech32(owner))).balance.toString();
}
