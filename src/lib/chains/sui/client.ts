import { SuiGrpcClient } from '@mysten/sui/grpc';
import { bcs } from '@mysten/sui/bcs';
import { estimateSuiRewards, estimateSuiApy } from './rewards';

export const SUI_RPC = 'https://fullnode.mainnet.sui.io:443';
export const suiClient = new SuiGrpcClient({ network: 'mainnet', baseUrl: SUI_RPC });
const RATE = bcs.struct('PoolTokenExchangeRate', { sui: bcs.u64(), pool: bcs.u64() });

export async function readSuiState() {
  const result = await suiClient.ledgerService.getEpoch({ readMask: { paths: ['system_state'] } });
  const state = result.response.epoch?.systemState;
  if (!state?.validators || state.epoch === undefined) throw new Error('Sui 네트워크 상태를 조회하지 못했습니다.');
  return state;
}

export async function readSuiValidators() {
  const state = await readSuiState();
  return state.validators!.activeValidators.map((validator) => {
    if (!validator.address || !validator.name || !validator.stakingPool?.id || !validator.stakingPool.exchangeRates?.id || validator.commissionRate === undefined || validator.stakingPool.suiBalance === undefined) throw new Error('Sui 검증자 응답에 필요한 값이 없습니다.');
    return {
      address: validator.address, name: validator.name, logo: validator.imageUrl ?? null,
      commission: Number(validator.commissionRate) / 10_000, votingPower: validator.stakingPool.suiBalance.toString(),
      status: 'active' as const, description: validator.description ?? '', poolId: validator.stakingPool.id,
      exchangeRatesId: validator.stakingPool.exchangeRates.id, activationEpoch: validator.stakingPool.activationEpoch,
    };
  });
}

async function readRate(tableId: string, epoch: bigint) {
  const result = await suiClient.core.getDynamicField({ parentId: tableId, name: { type: 'u64', bcs: bcs.u64().serialize(epoch).toBytes() } });
  const rate = RATE.parse(result.dynamicField.value.bcs);
  return { sui: BigInt(rate.sui), pool: BigInt(rate.pool) };
}

export async function readSuiValidatorYield(tableId: string, activationEpoch: bigint) {
  const state = await readSuiState();
  const epoch = state.epoch!;
  const start = epoch - activationEpoch > BigInt(30) ? epoch - BigInt(30) : activationEpoch;
  if (start >= epoch || !state.parameters?.epochDurationMs) throw new Error('수익률 계산에 필요한 예치 기간이 부족합니다.');
  const [initial, current] = await Promise.all([readRate(tableId, start), readRate(tableId, epoch)]);
  return estimateSuiApy(initial, current, Number(epoch - start) * Number(state.parameters.epochDurationMs));
}

export async function readSuiPositions(owner: string) {
  const [state, validators] = await Promise.all([readSuiState(), readSuiValidators()]);
  const items = [];
  let cursor: string | null | undefined;
  const seen = new Set<string>();
  do {
    const page = await suiClient.core.listOwnedObjects({ owner, type: '0x3::staking_pool::StakedSui', include: { json: true }, limit: 50, cursor });
    items.push(...page.objects);
    cursor = page.hasNextPage ? page.cursor : null;
    if (page.hasNextPage && (!cursor || seen.has(cursor))) throw new Error('Sui 예치 목록의 페이지 정보가 올바르지 않습니다.');
    if (cursor) seen.add(cursor);
  } while (cursor);
  return Promise.all(items.map(async (item) => {
    const fields = item.json;
    if (!fields || typeof fields.principal !== 'string' || typeof fields.stake_activation_epoch !== 'string' || typeof fields.pool_id !== 'string') throw new Error('Sui 예치 객체의 형식이 올바르지 않습니다.');
    const principal = BigInt(fields.principal);
    const activationEpoch = BigInt(fields.stake_activation_epoch);
    const validator = validators.find((candidate) => candidate.poolId === fields.pool_id);
    const pending = activationEpoch > state.epoch!;
    let rewards: bigint | null = pending ? BigInt(0) : null;
    if (!pending && validator) {
      const [initial, current] = await Promise.all([readRate(validator.exchangeRatesId, activationEpoch), readRate(validator.exchangeRatesId, state.epoch!)]);
      rewards = estimateSuiRewards(principal, initial, current);
    }
    return { objectId: item.objectId, validatorAddress: validator?.address ?? fields.pool_id, validatorName: validator?.name ?? '비활성 풀', principal, rewards, activationEpoch, pending };
  }));
}
