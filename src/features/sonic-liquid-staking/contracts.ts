import { parseAbi } from 'viem';

export const STS = '0xe5da20f15420ad15de0fa650600afc998bbe3955';
export const STS_ABI = parseAbi([
  'function deposit() payable returns (uint256)',
  'function undelegateFromPool(uint256 amountShares) returns (uint256)',
  'function undelegateMany(uint256[] validatorIds, uint256[] amountShares) returns (uint256[])',
  'function withdraw(uint256 withdrawId, bool emergency) returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function getRate() view returns (uint256)',
  'function convertToShares(uint256) view returns (uint256)',
  'function totalPool() view returns (uint256)',
  'function depositPaused() view returns (bool)',
  'function undelegatePaused() view returns (bool)',
  'function undelegateFromPoolPaused() view returns (bool)',
  'function withdrawPaused() view returns (bool)',
  'function withdrawDelay() view returns (uint256)',
  'function MIN_DEPOSIT() view returns (uint256)',
  'function MIN_UNDELEGATE_AMOUNT_SHARES() view returns (uint256)',
  'function userNumWithdraws(address) view returns (uint256)',
  'function userWithdraws(address, uint256) view returns (uint256)',
  'function getWithdrawRequest(uint256) view returns ((uint8 kind,uint256 validatorId,uint256 assetAmount,bool isWithdrawn,uint256 requestTimestamp,address user))',
]);
