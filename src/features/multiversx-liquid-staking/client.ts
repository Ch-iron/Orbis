import { Address } from '@multiversx/sdk-core/out/core/address';
import { MULTIVERSX_API, multiversxView, readMultiversxBalance } from '@/lib/chains/multiversx/client';

export const XOXNO_POOL = 'erd1qqqqqqqqqqqqqpgq6uzdzy54wnesfnlaycxwymrn9texlnmyah0ssrfvk6';
type WithdrawalToken = { identifier: string; nonce: number; balance: string; attributes: string };

export async function readXoxnoPosition(owner: string) {
  Address.newFromBech32(owner);
  const [balance, tokenResult, withdrawalResult, rateResult, stateResult, periodResult, network] = await Promise.all([
    readMultiversxBalance(owner), view('getLsTokenId'), view('getUnstakeTokenId'), view('getExchangeRate'), view('getState'), view('unbondPeriod'),
    api<{ epoch: number }>('/stats'),
  ]);
  const token = atob(tokenResult);
  const withdrawalToken = atob(withdrawalResult);
  if (!/^[A-Z0-9]{3,10}-[a-f0-9]{6}$/.test(token) || !/^[A-Z0-9]{3,10}-[a-f0-9]{6}$/.test(withdrawalToken)) throw new Error('Invalid XOXNO token identifiers.');
  if (!Number.isSafeInteger(network.epoch) || network.epoch < 0) throw new Error('Invalid MultiversX epoch.');
  const tokens = await api<Array<{ identifier: string; balance: string }>>(`/accounts/${owner}/tokens?identifier=${token}&size=1`);
  if (!Array.isArray(tokens)) throw new Error('Invalid XOXNO token balance response.');
  const tickets = [];
  for (let from = 0; ; from += 100) {
    const page = await api<WithdrawalToken[]>(`/accounts/${owner}/nfts?collections=${withdrawalToken}&from=${from}&size=100`);
    if (!Array.isArray(page)) throw new Error('Invalid XOXNO withdrawal token response.');
    for (const item of page) {
      if (!Number.isSafeInteger(item.nonce) || item.nonce <= 0) throw new Error('Invalid XOXNO withdrawal nonce.');
      const attributes = atob(item.attributes);
      if (attributes.length !== 16) throw new Error('Invalid XOXNO withdrawal attributes.');
      const unlockEpoch = decodeInteger(btoa(attributes.slice(8)));
      tickets.push({ id: item.identifier, nonce: BigInt(item.nonce), amount: integer(item.balance), unlockEpoch, ready: BigInt(network.epoch) >= unlockEpoch });
    }
    if (page.length < 100) break;
  }
  const receipt = tokens.find((item) => item.identifier === token);
  return { available: integer(balance), receipt: receipt ? integer(receipt.balance) : BigInt(0), token, withdrawalToken, rate: decodeInteger(rateResult), active: decodeInteger(stateResult) === BigInt(1), unbondPeriod: decodeInteger(periodResult), tickets };
}

async function view(method: string) {
  const values = await multiversxView(XOXNO_POOL, method, []);
  if (values.length !== 1) throw new Error(`Invalid XOXNO ${method} response.`);
  return values[0];
}
async function api<T>(path: string): Promise<T> {
  const response = await fetch(`${MULTIVERSX_API}${path}`);
  if (!response.ok) throw new Error(`MultiversX request failed (${response.status}).`);
  return response.json();
}
function decodeInteger(value: string) {
  const hex = Array.from(atob(value), (character) => character.charCodeAt(0).toString(16).padStart(2, '0')).join('');
  return BigInt(`0x${hex || '0'}`);
}
function integer(value: string) {
  if (!/^\d+$/.test(value)) throw new Error('Invalid MultiversX balance.');
  return BigInt(value);
}
