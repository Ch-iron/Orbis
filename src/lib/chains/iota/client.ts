import { IotaClient } from '@iota/iota-sdk/client';

export const IOTA_RPC = 'https://api.mainnet.iota.cafe';
export const iotaClient = new IotaClient({ url: IOTA_RPC });

export async function readIotaValidators() {
  const state = await iotaClient.getLatestIotaSystemState();
  return state.activeValidators.map((validator) => ({
    address: validator.iotaAddress, name: validator.name, logo: validator.imageUrl || null,
    commission: Number(validator.effectiveCommissionRate ?? validator.commissionRate) / 10_000,
    votingPower: validator.stakingPoolIotaBalance, status: 'active' as const, description: validator.description,
  }));
}

export async function readIotaYields() {
  const result = await iotaClient.getValidatorsApy();
  return new Map(result.apys.map((item) => {
    if (!Number.isFinite(item.apy) || item.apy < 0) throw new Error('Invalid IOTA yield rate response.');
    return [item.address, item.apy];
  }));
}

export async function readIotaPositions(owner: string) {
  const stakes = await iotaClient.getStakes({ owner });
  return stakes.flatMap((pool) => pool.stakes.map((stake) => ({
    validatorAddress: pool.validatorAddress, objectId: stake.stakedIotaId,
    principal: BigInt(stake.principal), rewards: stake.status === 'Active' ? BigInt(stake.estimatedReward) : BigInt(0),
    status: stake.status, activationEpoch: BigInt(stake.stakeActiveEpoch),
  })));
}
