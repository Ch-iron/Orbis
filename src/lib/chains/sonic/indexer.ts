import type { Address } from 'viem';

async function query(query: string, variables: Record<string, string> = {}) {
  const response = await fetch('https://xapi.sonic.soniclabs.com', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, variables }) });
  if (!response.ok) throw new Error('Sonic 조회 API에 연결하지 못했습니다.');
  const body = object(await response.json());
  if (body.errors) throw new Error('Sonic 조회 API가 오류를 반환했습니다.');
  return object(body.data);
}

export async function readSonicWithdrawalKeys(owner: Address) {
  const data = await query('query($address: Address!) { delegationsByAddress(address: $address) { edges { delegation { toStakerId withdrawRequests { withdrawRequestID } } } } }', { address: owner });
  const connection = object(data.delegationsByAddress);
  if (!Array.isArray(connection.edges)) throw new Error('Sonic 위임 목록 응답이 올바르지 않습니다.');
  return connection.edges.flatMap((edge: unknown) => {
    const delegation = object(object(edge).delegation);
    if (!Array.isArray(delegation.withdrawRequests)) throw new Error('Sonic 출금 목록 응답이 올바르지 않습니다.');
    return delegation.withdrawRequests.map((request: unknown) => ({ validatorId: integer(delegation.toStakerId), requestId: integer(object(request).withdrawRequestID) }));
  });
}

export async function readSonicValidatorNames() {
  const data = await query('query { stakers { id stakerInfo { name } } }');
  if (!Array.isArray(data.stakers)) throw new Error('Sonic 검증자 목록 응답이 올바르지 않습니다.');
  return new Map(data.stakers.map((item: unknown) => {
    const row = object(item);
    const name = row.stakerInfo ? object(row.stakerInfo).name : null;
    return [integer(row.id).toString(), typeof name === 'string' ? name : `Validator #${integer(row.id)}`];
  }));
}

export async function readSonicBaseApr() {
  const response = await fetch('https://apr.soniclabs.com/current');
  if (!response.ok) throw new Error('Sonic 수익률을 조회하지 못했습니다.');
  const data = object(object(await response.json()).data);
  if (typeof data.apr !== 'number' || !Number.isFinite(data.apr) || data.apr < 0) throw new Error('Sonic 수익률 응답이 올바르지 않습니다.');
  return data.apr / 100;
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('잘못된 Sonic API 응답입니다.');
  return value as Record<string, unknown>;
}

function integer(value: unknown) {
  if (typeof value !== 'string' || !/^(0x[\da-fA-F]+|\d+)$/.test(value)) throw new Error('잘못된 Sonic 식별자입니다.');
  return BigInt(value);
}
