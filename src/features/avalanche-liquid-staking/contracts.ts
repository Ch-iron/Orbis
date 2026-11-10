import { parseAbi } from 'viem';

export const SAVAX = '0x2b2c81e08f1af8835a78bb2a90ae924ace0ea4be';
export const SAVAX_ABI = parseAbi([
  'function submit() payable returns (uint256)',
  'function requestUnlock(uint256 shareAmount)',
  'function redeem(uint256 unlockIndex)',
  'function cancelUnlockRequest(uint256 unlockIndex)',
  'function balanceOf(address) view returns (uint256)',
  'function getPooledAvaxByShares(uint256) view returns (uint256)',
  'function getUnlockRequestCount(address) view returns (uint256)',
  'function userUnlockRequests(address,uint256) view returns (uint256 startedAt,uint256 shareAmount)',
  'function cooldownPeriod() view returns (uint256)',
  'function redeemPeriod() view returns (uint256)',
  'function paused() view returns (bool)',
  'function mintingPaused() view returns (bool)',
  'function totalPooledAvax() view returns (uint256)',
  'function totalPooledAvaxCap() view returns (uint256)',
]);
