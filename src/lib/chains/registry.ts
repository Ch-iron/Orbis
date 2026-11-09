// Chain registry with supported chain configurations

import { AVALANCHE_CONFIG } from './avalanche';
import { IOTEX_CONFIG } from './iotex';
import { CARDANO_CONFIG } from './cardano';
import { VECHAIN_CONFIG } from './vechain';
import { TON_CONFIG } from './ton';
import type { ChainConfig } from './types';
import { ALGORAND_CONFIG } from './algorand';
import { SONIC_CONFIG } from './sonic';
import { IOTA_CONFIG } from './iota';
import { POLYGON_CONFIG } from './polygon';
import { MULTIVERSX_CONFIG } from './multiversx';
import { NEAR_CONFIG } from './near';
import { APTOS_CONFIG } from './aptos';
import { SUI_CONFIG } from './sui';
import { XPLA_CONFIG } from './xpla';
import { SEI_CONFIG } from './sei';
import { KAIA_CONFIG } from './kaia';
import { ETHEREUM_CONFIG } from './ethereum';
import { CELESTIA_CONFIG, DYDX_CONFIG } from './native-cosmos/config';

const CHAIN_REGISTRY: Record<string, ChainConfig> = {
  avalanche: AVALANCHE_CONFIG,
  iotex: IOTEX_CONFIG,
  cardano: CARDANO_CONFIG,
  vechain: VECHAIN_CONFIG,
  ton: TON_CONFIG,
  polygon: POLYGON_CONFIG,
  multiversx: MULTIVERSX_CONFIG,
  near: NEAR_CONFIG,
  aptos: APTOS_CONFIG,
  sui: SUI_CONFIG,
  iota: IOTA_CONFIG,
  sonic: SONIC_CONFIG,
  algorand: ALGORAND_CONFIG,
  xpla: XPLA_CONFIG,
  sei: SEI_CONFIG,
  kaia: KAIA_CONFIG,
  ethereum: ETHEREUM_CONFIG,
  celestia: CELESTIA_CONFIG,
  dydx: DYDX_CONFIG,
};

const SORTED_CHAIN_CONFIGS = Object.values(CHAIN_REGISTRY).sort(
  (chainA, chainB) => chainA.name.localeCompare(chainB.name),
);

const SORTED_CHAIN_SLUGS = SORTED_CHAIN_CONFIGS.map((config) => config.slug);

const DEFAULT_CHAIN_SLUG = 'xpla';

export { CHAIN_REGISTRY, SORTED_CHAIN_CONFIGS, SORTED_CHAIN_SLUGS, DEFAULT_CHAIN_SLUG };
