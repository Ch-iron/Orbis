import { parseAbi } from 'viem';

export const STPOL = '0x2ff4390dB61F282Ef4E6D4612c776b809a541753';
export const PRIORITY_POOL = '0xCfa197495CF8E82D7B5df858F55B73208B8B9d67';
export const WITHDRAWAL_POOL = '0xbfbF47b2a3B9e54A44257bf57d4b078170096458';
export const STPOL_ABI = parseAbi(['function canDeposit() view returns (uint256)', 'function getStrategies() view returns (address[])']);
export const PRIORITY_ABI = parseAbi([
  'function poolStatus() view returns (uint8)',
  'function totalQueued() view returns (uint256)',
  'function deposit(uint256,bool,bytes[])',
  'function withdraw(uint256,uint256,uint256,bytes32[],bool,bool,bytes[])',
]);
export const WITHDRAWAL_ABI = parseAbi([
  'function getTotalQueuedWithdrawals() view returns (uint256)',
  'function getAccountTotalQueuedWithdrawals(address) view returns (uint256)',
  'function getFinalizedWithdrawalIdsByOwner(address) view returns (uint256[],uint256)',
  'function getBatchIds(uint256[]) view returns (uint256[])',
  'function minWithdrawalAmount() view returns (uint256)',
  'function withdraw(uint256[],uint256[])',
]);
