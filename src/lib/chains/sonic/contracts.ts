import { parseAbi } from 'viem';

export const SFC = '0xFC00FACE00000000000000000000000000000000' as const;
export const SFC_ABI = parseAbi([
  'function lastValidatorID() view returns (uint256)',
  'function getValidator(uint256) view returns (uint256 status,uint256 receivedStake,address auth,uint256 createdEpoch,uint256 createdTime,uint256 deactivatedTime,uint256 deactivatedEpoch)',
  'function getStake(address,uint256) view returns (uint256)',
  'function pendingRewards(address,uint256) view returns (uint256)',
  'function getWithdrawalRequest(address,uint256,uint256) view returns (uint256 epoch,uint256 time,uint256 amount)',
  'function currentEpoch() view returns (uint256)',
  'function constsAddress() view returns (address)',
  'function delegate(uint256) payable',
  'function undelegate(uint256,uint256,uint256)',
  'function withdraw(uint256,uint256)',
  'function claimRewards(uint256)',
  'function restakeRewards(uint256)',
  'event Undelegated(address indexed delegator,uint256 indexed toValidatorID,uint256 indexed wrID,uint256 amount)',
]);
export const CONSTANTS_ABI = parseAbi([
  'function withdrawalPeriodTime() view returns (uint256)',
  'function withdrawalPeriodEpochs() view returns (uint256)',
  'function validatorCommission() view returns (uint256)',
]);
