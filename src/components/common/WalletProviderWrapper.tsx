'use client';

import { ReactNode } from 'react';
import { WalletProvider, NetworkInfo } from '@xpla/wallet-provider';

// XPLA mainnet network configuration
const MAINNET: NetworkInfo = {
  name: 'mainnet',
  chainID: 'dimension_37-1',
  lcd: 'https://dimension-lcd.xpla.dev',
  ecd: 'https://dimension-evm-rpc.xpla.dev',
  walletconnectID: 0,
};

// XPLA testnet network configuration
const TESTNET: NetworkInfo = {
  name: 'testnet',
  chainID: 'cube_47-5',
  lcd: 'https://cube-lcd.xpla.dev',
  ecd: 'https://cube-evm-rpc.xpla.dev',
  walletconnectID: 1,
};

type WalletProviderWrapperProps = {
  children: ReactNode;
};

const WalletProviderWrapper = ({ children }: WalletProviderWrapperProps) => {
  return (
    <WalletProvider
      defaultNetwork={MAINNET}
      walletConnectChainIds={{
        0: MAINNET,
        1: TESTNET,
      }}
    >
      {children}
    </WalletProvider>
  );
};

export { WalletProviderWrapper };
