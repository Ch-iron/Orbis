'use client';

import type { ReactNode } from 'react';
import { ChainProvider } from '@cosmos-kit/react';
import { wallets as keplrWallets } from '@cosmos-kit/keplr';
import { wallets as cosmostationWallets } from '@cosmos-kit/cosmostation';
import { chains, assets } from 'chain-registry';
import '@interchain-ui/react/styles';
import { WALLET_CONNECT_PROJECT_ID } from './constants';

const chainNames = ['xpla', 'celestia', 'dydx'];
const supportedChains = chains.filter((chain) => chainNames.includes(chain.chain_name));
const supportedAssets = assets.filter((assetList) => chainNames.includes(assetList.chain_name));

if (supportedChains.length !== chainNames.length || supportedAssets.length !== chainNames.length) {
  throw new Error('Cosmos chain data not found in chain-registry');
}

const allWallets = [...keplrWallets, ...cosmostationWallets];

type CosmosProviderProps = {
  children: ReactNode;
};

const CosmosProvider = ({ children }: CosmosProviderProps) => {
  return (
    <ChainProvider
      chains={supportedChains}
      assetLists={supportedAssets}
      wallets={allWallets}
      walletConnectOptions={
        WALLET_CONNECT_PROJECT_ID
          ? { signClient: { projectId: WALLET_CONNECT_PROJECT_ID } }
          : undefined
      }
      throwErrors={false}
      modalTheme={{ defaultTheme: 'dark' }}
      signerOptions={{
        preferredSignType: () => 'amino',
      }}
      endpointOptions={{
        endpoints: {
          celestia: { rpc: ['https://celestia-rpc.publicnode.com'], rest: ['https://celestia-rest.publicnode.com'] },
          dydx: { rpc: ['https://dydx-rpc.publicnode.com'], rest: ['https://dydx-rest.publicnode.com'] },
        },
      }}
    >
      {children}
    </ChainProvider>
  );
};

export { CosmosProvider };
