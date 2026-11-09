import { createPublicClient, http, parseEventLogs } from 'viem';
import type { Address, Hex } from 'viem';
import { sonic } from 'viem/chains';
import { readSonicWithdrawalKeys } from './indexer';
import { SFC, SFC_ABI, CONSTANTS_ABI } from './contracts';

export const sonicClient = createPublicClient({ chain: sonic, transport: http('https://rpc.soniclabs.com'), batch: { multicall: true } });

export async function readSonicParameters() {
  const address = await sonicClient.readContract({ address: SFC, abi: SFC_ABI, functionName: 'constsAddress' });
  const [seconds, epochs, commission] = await Promise.all([
    sonicClient.readContract({ address, abi: CONSTANTS_ABI, functionName: 'withdrawalPeriodTime' }),
    sonicClient.readContract({ address, abi: CONSTANTS_ABI, functionName: 'withdrawalPeriodEpochs' }),
    sonicClient.readContract({ address, abi: CONSTANTS_ABI, functionName: 'validatorCommission' }),
  ]);
  return { seconds, epochs, commission: Number(commission) / 1e18 };
}

export async function readSonicValidators() {
  const [last, parameters] = await Promise.all([
    sonicClient.readContract({ address: SFC, abi: SFC_ABI, functionName: 'lastValidatorID' }), readSonicParameters(),
  ]);
  const validators = [];
  for (let start = BigInt(1); start <= last; start += BigInt(25)) {
    const ids = Array.from({ length: Number(last - start + BigInt(1) > BigInt(25) ? BigInt(25) : last - start + BigInt(1)) }, (_, i) => start + BigInt(i));
    const batch = await Promise.all(ids.map(async (id) => {
      const data = await sonicClient.readContract({ address: SFC, abi: SFC_ABI, functionName: 'getValidator', args: [id] });
      return { id, status: data[0], receivedStake: data[1], auth: data[2], deactivatedTime: data[5], deactivatedEpoch: data[6], commission: parameters.commission };
    }));
    validators.push(...batch);
  }
  return validators;
}

export async function readSonicPositions(owner: Address) {
  const validators = await readSonicValidators();
  return Promise.all(validators.map(async (validator) => {
    const [amount, rewards] = await Promise.all([
      sonicClient.readContract({ address: SFC, abi: SFC_ABI, functionName: 'getStake', args: [owner, validator.id] }),
      sonicClient.readContract({ address: SFC, abi: SFC_ABI, functionName: 'pendingRewards', args: [owner, validator.id] }),
    ]);
    return { ...validator, amount, rewards };
  }));
}

export async function readSonicWithdrawal(owner: Address, validatorId: bigint, requestId: bigint) {
  const [request, validator, parameters, epoch, block] = await Promise.all([
    sonicClient.readContract({ address: SFC, abi: SFC_ABI, functionName: 'getWithdrawalRequest', args: [owner, validatorId, requestId] }),
    sonicClient.readContract({ address: SFC, abi: SFC_ABI, functionName: 'getValidator', args: [validatorId] }),
    readSonicParameters(), sonicClient.readContract({ address: SFC, abi: SFC_ABI, functionName: 'currentEpoch' }), sonicClient.getBlock(),
  ]);
  const earlierDeactivation = validator[5] > BigInt(0) && validator[5] < request[1];
  const unlockTime = (earlierDeactivation ? validator[5] : request[1]) + parameters.seconds;
  const unlockEpoch = (earlierDeactivation ? validator[6] : request[0]) + parameters.epochs;
  return { validatorId, requestId, amount: request[2], unlockTime, unlockEpoch, ready: request[2] > BigInt(0) && block.timestamp >= unlockTime && epoch >= unlockEpoch };
}

export async function readSonicWithdrawalFromTransaction(owner: Address, hash: Hex) {
  const receipt = await sonicClient.getTransactionReceipt({ hash });
  const logs = parseEventLogs({ abi: SFC_ABI, eventName: 'Undelegated', logs: receipt.logs.filter((log) => log.address.toLowerCase() === SFC.toLowerCase()) });
  const requests = logs.filter((log) => log.args.delegator.toLowerCase() === owner.toLowerCase());
  if (receipt.status !== 'success' || requests.length === 0) throw new Error('이 지갑의 Sonic 해제 거래가 아닙니다.');
  return Promise.all(requests.map((log) => readSonicWithdrawal(owner, log.args.toValidatorID, log.args.wrID)));
}

export async function readSonicWithdrawals(owner: Address) {
  const keys = await readSonicWithdrawalKeys(owner);
  const requests = await Promise.all(keys.map((key) => readSonicWithdrawal(owner, key.validatorId, key.requestId)));
  return requests.filter((request) => request.amount > BigInt(0));
}
