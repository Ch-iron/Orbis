// Singleton factory for XPLA LCDClient instances

import { LCDClient } from '@xpla/xpla.js';

// Singleton map keyed by chain ID
const clientMap = new Map<string, LCDClient>();

const createXplaClient = (lcdUrl: string, chainId: string): LCDClient => {
  const existingClient = clientMap.get(chainId);
  if (existingClient) {
    return existingClient;
  }

  const client = new LCDClient({
    URL: lcdUrl,
    chainID: chainId,
  });

  clientMap.set(chainId, client);
  return client;
};

export { createXplaClient };
