import { parseAbi } from 'viem';
// Hayabusa contracts, published at docs.stargate.vechain.org/for-developers/contracts.
export const STARGATE = '0x03c557be98123fdb6fad325328ac6eb77de7248c' as const;
export const STARGATE_NFT = '0x1856c533ac2d94340aaa8544d35a5c1d4a21dee7' as const;
export const PROTOCOL_STAKER = '0x00000000000000000000000000005374616B6572' as const;
export const STARGATE_ABI = parseAbi([
  'function stake(uint8 levelId) payable returns (uint256)',
  'function unstake(uint256 tokenId)',
  'function delegate(uint256 tokenId,address validator)',
  'function requestDelegationExit(uint256 tokenId)',
  'function claimRewards(uint256 tokenId)',
  'function claimableRewards(uint256 tokenId) view returns (uint256)',
  'function lockedRewards(uint256 tokenId) view returns (uint256)',
  'function hasRequestedExit(uint256 tokenId) view returns (bool)',
  'function getDelegationDetails(uint256 tokenId) view returns ((uint256 delegationId,address validator,uint256 stake,uint8 probabilityMultiplier,uint32 startPeriod,uint32 endPeriod,bool isLocked,uint8 status))',
]);
export const NFT_ABI = parseAbi([
  'struct Level { string name; bool isX; uint8 id; uint64 maturityBlocks; uint64 scaledRewardFactor; uint256 vetAmountRequiredToStake; }',
  'struct Token { uint256 tokenId; uint8 levelId; uint64 mintedAtBlock; uint256 vetAmountStaked; uint48 lastVetGeneratedVthoClaimTimestamp; }',
  'function getLevels() view returns (Level[])',
  'function getLevel(uint8 levelId) view returns (Level)',
  'function getLevelSupply(uint8 levelId) view returns (uint208 circulating,uint32 cap)',
  'function tokensOwnedBy(address owner) view returns (Token[])',
  'function getToken(uint256 tokenId) view returns (Token)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function maturityPeriodEndBlock(uint256 tokenId) view returns (uint64)',
]);
export const STAKER_ABI = parseAbi([
  'function firstActive() view returns (address)',
  'function firstQueued() view returns (address)',
  'function next(address prev) view returns (address)',
  'function getValidation(address validator) view returns (address endorser,uint256 stake,uint256 weight,uint256 queuedStake,uint8 status,uint32 offlineBlock)',
  'function getValidationPeriodDetails(address validator) view returns (uint32 period,uint32 startBlock,uint32 exitBlock,uint32 completedPeriods)',
]);
