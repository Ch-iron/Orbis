import type { Address } from 'viem';

async function query(query: string, variables: Record<string, string> = {}) {
  const response = await fetch('https://xapi.sonic.soniclabs.com', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, variables }) });
  if (!response.ok) throw new Error('Could not connect to the Sonic query API.');
  const body = object(await response.json());
  if (body.errors) throw new Error('The Sonic query API returned an error.');
  return object(body.data);
}

export async function readSonicWithdrawalKeys(owner: Address) {
  const data = await query('query($address: Address!) { delegationsByAddress(address: $address) { edges { delegation { toStakerId withdrawRequests { withdrawRequestID } } } } }', { address: owner });
  const connection = object(data.delegationsByAddress);
  if (!Array.isArray(connection.edges)) throw new Error('Invalid Sonic delegation list response.');
  return connection.edges.flatMap((edge: unknown) => {
    const delegation = object(object(edge).delegation);
    if (!Array.isArray(delegation.withdrawRequests)) throw new Error('Invalid Sonic withdrawal list response.');
    return delegation.withdrawRequests.map((request: unknown) => ({ validatorId: integer(delegation.toStakerId), requestId: integer(object(request).withdrawRequestID) }));
  });
}

export async function readSonicValidatorNames() {
  const data = await query('query { stakers { id stakerInfo { name } } }');
  if (!Array.isArray(data.stakers)) throw new Error('Invalid Sonic validator list response.');
  return new Map(data.stakers.map((item: unknown) => {
    const row = object(item);
    const name = row.stakerInfo ? object(row.stakerInfo).name : null;
    return [integer(row.id).toString(), typeof name === 'string' ? name : `Validator #${integer(row.id)}`];
  }));
}

export async function readSonicBaseApr() {
  const response = await fetch('https://apr.soniclabs.com/current');
  if (!response.ok) throw new Error('Could not fetch the Sonic yield rate.');
  const data = object(object(await response.json()).data);
  if (typeof data.apr !== 'number' || !Number.isFinite(data.apr) || data.apr < 0) throw new Error('Invalid Sonic yield rate response.');
  return data.apr / 100;
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid Sonic API response.');
  return value as Record<string, unknown>;
}

function integer(value: unknown) {
  if (typeof value !== 'string' || !/^(0x[\da-fA-F]+|\d+)$/.test(value)) throw new Error('Invalid Sonic identifier.');
  return BigInt(value);
}
