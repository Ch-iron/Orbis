import { AlgoAmount } from '@algorandfoundation/algokit-utils/types/amount';
import { getABIStructFromABITuple, getABITupleTypeFromABIStructDefinition } from '@algorandfoundation/algokit-utils/types/app-arc56';
import { getApplicationAddress } from 'algosdk';
import { createRetiClients, RETI_APP_ID } from './contracts';
import { array, integer, record, decodeValidator } from './decode';
import type { RetiValidator } from './decode';

const { algorand, registry, pool } = createRetiClients();

export async function readRetiValidators() {
  const validators: RetiValidator[] = [];
  const seen = new Set<string>();
  let next: string | undefined;
  let round: number | undefined;
  const fields = registry.appSpec.structs.ValidatorInfo;
  const tupleType = getABITupleTypeFromABIStructDefinition(fields, registry.appSpec.structs);
  do {
    let request = algorand.client.algod.getApplicationBoxes(RETI_APP_ID).prefix(new TextEncoder().encode('v')).include('values').limit(200).next(next);
    if (round !== undefined) request = request.round(round);
    const response = await request.do();
    round = response.round;
    for (const box of response.boxes) {
      if (!box.value) throw new Error('Réti node did not return box values.');
      const tuple = tupleType.decode(box.value);
      const decoded = getABIStructFromABITuple(tuple, fields, registry.appSpec.structs);
      validators.push(decodeValidator(decoded));
    }
    next = response.nextToken;
    if (next && seen.has(next)) throw new Error('Repeated Réti pagination token.');
    if (next) seen.add(next);
  } while (next);
  return validators;
}

export async function readRetiPositions(owner: string) {
  const result = await registry.send.call({ method: 'getStakedPoolsForAccount', args: [owner] });
  const positions = array(result.return).map((item) => {
    const tuple = array(item);
    return { validatorId: integer(tuple[0]), poolAppId: integer(tuple[2]) };
  });
  const unique = [...new Map(positions.map((position) => [position.poolAppId.toString(), position])).values()];
  return Promise.all(unique.map(async (position) => {
    const result = await pool(position.poolAppId).send.call({ method: 'getStakerInfo', args: [owner], extraFee: AlgoAmount.MicroAlgos(20_000) });
    const info = record(result.return);
    if (info.account !== owner) throw new Error('Réti returned a different staker account.');
    return { ...position, balance: integer(info.balance), totalRewarded: integer(info.totalRewarded), rewardTokenBalance: integer(info.rewardTokenBalance) };
  }));
}

export async function readAlgorandAccount(owner: string) {
  const account = await algorand.client.algod.accountInformation(owner).do();
  return { amount: account.amount, minimumBalance: account.minBalance, assets: account.assets ?? [] };
}

export async function readRetiPoolYield(poolAppId: bigint) {
  const address = getApplicationAddress(poolAppId).toString();
  const response = await fetch(`https://afmetrics.api.nodely.io/v1/realtime/reti/pool/${address}/apy?format=JSON`);
  if (!response.ok) throw new Error('Réti pool APY is unavailable.');
  const data: unknown = await response.json();
  const apy = record(data).apy;
  if (typeof apy !== 'number' || !Number.isFinite(apy) || apy < 0) throw new Error('Invalid Réti pool APY.');
  return apy / 100;
}

export async function readRetiRegistrationCost(owner: string) {
  const needs = await registry.send.call({ method: 'doesStakerNeedToPayMBR', args: [owner] });
  if (typeof needs.return !== 'boolean') throw new Error('Invalid Réti registration response.');
  if (!needs.return) return BigInt(0);
  const result = await registry.send.call({ method: 'getMbrAmounts', args: [] });
  return integer(record(result.return).addStakerMbr);
}

export async function readRetiPoolCapacity(validatorId: bigint, owner: string, amount: bigint) {
  const [selection, constraints] = await Promise.all([
    registry.send.call({ method: 'findPoolForStaker', args: [validatorId, owner, amount] }),
    registry.send.call({ method: 'getProtocolConstraints', args: [] }),
  ]);
  const selected = array(selection.return);
  const key = array(selected[0]);
  const poolAppId = integer(key[2]);
  if (poolAppId === BigInt(0)) throw new Error('예치 가능한 풀이 없습니다.');
  const stakers = integer(await pool(poolAppId).state.global.getValue('numStakers'));
  const maximum = integer(record(constraints.return).maxStakersPerPool);
  return { poolAppId, full: stakers >= maximum };
}
