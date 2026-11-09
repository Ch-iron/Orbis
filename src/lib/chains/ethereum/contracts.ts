import { parseAbi } from 'viem';

export const STETH = '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84';
export const LIDO_QUEUE = '0x889edC2eDab5f40e902b864aD4d7AdE8E412F9B1';
export const RETH = '0xae78736Cd615f374D3085123A210448E74Fc6393';
export const ROCKET_STORAGE = '0x1d8f8f00cfa6758d7bE78336684788Fb0ee0Fa46';

export const STETH_ABI = parseAbi([
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address,address) view returns (uint256)',
  'function approve(address,uint256) returns (bool)',
  'function submit(address) payable returns (uint256)',
  'function getCurrentStakeLimit() view returns (uint256)',
]);
export const QUEUE_ABI = parseAbi([
  'function getWithdrawalRequests(address) view returns (uint256[])',
  'function getWithdrawalStatus(uint256[]) view returns ((uint256 amountOfStETH, uint256 amountOfShares, address owner, uint256 timestamp, bool isFinalized, bool isClaimed)[])',
  'function MIN_STETH_WITHDRAWAL_AMOUNT() view returns (uint256)',
  'function MAX_STETH_WITHDRAWAL_AMOUNT() view returns (uint256)',
  'function requestWithdrawals(uint256[],address) returns (uint256[])',
  'function claimWithdrawal(uint256)',
]);
export const RETH_ABI = parseAbi([
  'function balanceOf(address) view returns (uint256)',
  'function getEthValue(uint256) view returns (uint256)',
  'function getRethValue(uint256) view returns (uint256)',
  'function getTotalCollateral() view returns (uint256)',
  'function burn(uint256)',
]);
export const STORAGE_ABI = parseAbi(['function getAddress(bytes32) view returns (address)']);
export const DEPOSIT_ABI = parseAbi([
  'function deposit() payable',
  'function getMaximumDepositAmount() view returns (uint256)',
]);
export const DEPOSIT_SETTINGS_ABI = parseAbi([
  'function getDepositEnabled() view returns (bool)',
  'function getMinimumDeposit() view returns (uint256)',
  'function getDepositFee() view returns (uint256)',
]);
