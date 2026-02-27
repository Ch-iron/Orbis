'use client';

import { ReactNode } from 'react';
import { ChainProvider } from '@cosmos-kit/react';
import { wallets as keplrWallets } from '@cosmos-kit/keplr';
import { wallets as leapWallets } from '@cosmos-kit/leap';
import { wallets as cosmostationWallets } from '@cosmos-kit/cosmostation';
import { chains, assets } from 'chain-registry';
import '@interchain-ui/react/styles';
import { WALLET_CONNECT_PROJECT_ID } from './constants';

const xplaChain = chains.find((chain) => chain.chain_id === 'dimension_37-1')!;
const xplaTestChain = chains.find((chain) => chain.chain_id === 'cube_47-5')!;
const xplaAssets = assets.find((assetList) => assetList.chain_name === 'xpla')!;
const xplaTestAssets = assets.find((assetList) => assetList.chain_name === 'xplatestnet')!;

// Cast needed due to cosmjs version mismatch between wallet extensions (0.38) and cosmos-kit core (0.36)
// The `Algo` type added `ethsecp256k1` in 0.38, causing structural incompatibility at the type level
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const allWallets = [...keplrWallets, ...leapWallets, ...cosmostationWallets] as any[];

type CosmosProviderProps = {
  children: ReactNode;
};

const CosmosProvider = ({ children }: CosmosProviderProps) => {
  return (
    <ChainProvider
      chains={[xplaChain, xplaTestChain]}
      assetLists={[xplaAssets, xplaTestAssets]}
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
    >
      {children}
    </ChainProvider>
  );
};

export { CosmosProvider };
