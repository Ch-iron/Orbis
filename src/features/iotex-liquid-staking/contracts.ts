import { parseAbi } from 'viem';

export const BEDROCK = '0x2c914ba874d94090ba0e6f56790bb8eb6d4c7e5f';
export const UNIIOTX = '0x236f8c0a61da474db21b693fb2ea7aab0c803894';
export const BEDROCK_ABI = parseAbi([
  'function deposit(uint256 deadline) payable returns (uint256)',
  'function redeem(uint256 iotxsToRedeem, uint256 deadline) returns (uint256)',
  'function exchangeRatio() view returns (uint256)',
  'function currentReserve() view returns (uint256)',
  'function getRedeemAmountBase() view returns (uint256)',
  'function iotxClear() view returns (address)',
  'function paused() view returns (bool)',
]);
export const CLEAR_ABI = parseAbi([
  'function getBalance(address) view returns (uint256)',
  'function getDebt(address) view returns (uint256)',
  'function paused() view returns (bool)',
  'function claim(uint256 amount, address recipient)',
]);
