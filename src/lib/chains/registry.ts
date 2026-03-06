// Chain registry with supported chain configurations

import type { ChainConfig } from './types';
import { XPLA_CONFIG } from './xpla';
import { SEI_CONFIG } from './sei';

const CHAIN_REGISTRY: Record<string, ChainConfig> = {
  xpla: XPLA_CONFIG,
  sei: SEI_CONFIG,
};

const DEFAULT_CHAIN_SLUG = 'xpla';

export { CHAIN_REGISTRY, DEFAULT_CHAIN_SLUG };
