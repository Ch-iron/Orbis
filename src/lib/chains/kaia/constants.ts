// Kaia chain constants

const KAIA_CHAIN_ID = 8217;
const KAIA_RPC_URL = 'https://public-en.node.kaia.io';
const KAIA_RPC_URLS = [
  'https://public-en.node.kaia.io',
  'https://rpc.ankr.com/klaytn',
  'https://klaytn.drpc.org',
];
const KAIA_EXPLORER_URL = 'https://kaiascan.io';
const KAIA_KAIASCAN_API_URL = 'https://api-cypress.kaiascan.io/api';

// Unbonding period in days
const KAIA_UNBONDING_DAYS = 7;

// Block time in seconds (Kaia produces 1 block per second)
const KAIA_BLOCK_TIME_SECONDS = 1;

// Annual block count approximation
const KAIA_BLOCKS_PER_YEAR = Math.floor((365.25 * 24 * 60 * 60) / KAIA_BLOCK_TIME_SECONDS);

// Kaia Square API for council/validator metadata
const KAIA_SQUARE_API_URL = 'https://api-square.kaia.io/api';

export {
  KAIA_CHAIN_ID,
  KAIA_RPC_URL,
  KAIA_RPC_URLS,
  KAIA_EXPLORER_URL,
  KAIA_KAIASCAN_API_URL,
  KAIA_SQUARE_API_URL,
  KAIA_UNBONDING_DAYS,
  KAIA_BLOCK_TIME_SECONDS,
  KAIA_BLOCKS_PER_YEAR,
};
