import { pvm, utils } from '@avalabs/avalanchejs';
import { parseUnits } from 'viem';
import { avalancheP, readAvalancheBalance, readAvalancheContext, readAvalancheUtxos, readAvalancheCapacity, PRIMARY_NETWORK, validatePAddress } from '@/lib/chains/avalanche/client';
export type AvalancheAction = { nodeID: string; amount: string; endTime: number };
export async function prepareAvalancheAction(owner: string, action: AvalancheAction) {
  validatePAddress(owner);
  if (!/^\d+(\.\d{1,9})?$/.test(action.amount)) throw new Error('AVAX 수량은 소수점 9자리 이내로 입력하세요.');
  const amount = parseUnits(action.amount, 9);
  if (amount <= BigInt(0)) throw new Error('예치 수량은 0보다 커야 합니다.');
  const [minimum, clock, { validators }, balance] = await Promise.all([
    avalancheP.getMinStake(), avalancheP.getTimestamp(), avalancheP.getCurrentValidators({ nodeIDs: [action.nodeID], subnetID: PRIMARY_NETWORK }), readAvalancheBalance(owner),
  ]);
  if (amount < minimum.minDelegatorStake) throw new Error('메인넷 최소 위임 수량보다 적습니다.');
  const now = Math.floor(new Date(clock.timestamp).getTime() / 1000);
  if (!Number.isSafeInteger(now) || !Number.isSafeInteger(action.endTime)) throw new Error('위임 종료 시각이 올바르지 않습니다.');
  const start = BigInt(now + 60);
  const end = BigInt(action.endTime);
  // Helicon shortens validation periods; fixed-term delegations still require 14 days.
  if (end - start < BigInt(14 * 86400) || end - start > BigInt(365 * 86400)) throw new Error('위임 기간은 14–365일이어야 합니다.');
  const validator = validators.find((item) => item.nodeID === action.nodeID);
  if (!validator || start < BigInt(validator.startTime) || end > BigInt(validator.endTime)) throw new Error('위임 기간이 검증자의 현재 검증 기간 안에 있어야 합니다.');
  if (balance.unlocked <= amount) throw new Error('P-Chain의 잠금 해제 잔액과 거래 수수료가 부족합니다.');
  const weight = BigInt(validator.weight);
  const maximum = weight * BigInt(5) < BigInt(3000000) * BigInt(10) ** BigInt(9) ? weight * BigInt(5) : BigInt(3000000) * BigInt(10) ** BigInt(9);
  if (await readAvalancheCapacity(action.nodeID) + amount > maximum) throw new Error('해당 기간의 검증자 위임 수용 한도를 초과합니다.');
  const [context, utxos, feeState] = await Promise.all([readAvalancheContext(), readAvalancheUtxos(owner), avalancheP.getFeeState()]);
  const address = utils.bech32ToBytes(owner);
  const transaction = pvm.newAddPermissionlessDelegatorTx({ fromAddressesBytes: [address], changeAddressesBytes: [address], utxos, feeState, nodeId: action.nodeID, subnetId: PRIMARY_NETWORK, start, end, weight: amount, rewardAddresses: [address] }, context);
  return { transaction, start, end, amount };
}
