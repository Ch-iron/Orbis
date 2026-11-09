import { parseAbi } from 'viem';
export const POL = '0x455e53CBB86018Ac2B8092FdCd39d8444aFFC3F6';
export const STAKE_MANAGER = '0x5e3Ef299fDDf15eAa0432E6e66473ace8c13D908';
export const MANAGER_ABI = parseAbi([
  'function getValidatorContract(uint256) view returns (address)',
  'function isValidator(uint256) view returns (bool)',
  'function epoch() view returns (uint256)',
  'function withdrawalDelay() view returns (uint256)',
]);
export const SHARE_ABI = parseAbi([
  'function validatorId() view returns (uint256)',
  'function delegation() view returns (bool)',
  'function getTotalStake(address) view returns (uint256, uint256)',
  'function getLiquidRewards(address) view returns (uint256)',
  'function unbonds_new(address,uint256) view returns (uint256 shares,uint256 withdrawEpoch)',
  'function withdrawExchangeRate() view returns (uint256)',
  'function exchangeRate() view returns (uint256)',
  'function buyVoucherPOL(uint256,uint256) returns (uint256)',
  'function sellVoucher_newPOL(uint256,uint256)',
  'function unstakeClaimTokens_newPOL(uint256)',
  'function withdrawRewardsPOL()',
  'function restakePOL() returns (uint256,uint256)',
]);
