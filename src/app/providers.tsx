'use client';

import { ReactNode, useState } from 'react';
import dynamic from 'next/dynamic';
import { ThemeProvider } from 'next-themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';

// Dynamic import WalletProvider to avoid SSR localStorage access
const WalletProviderWrapper = dynamic(
  () => import('@/components/common/WalletProviderWrapper').then((mod) => mod.WalletProviderWrapper),
  { ssr: false },
);

// Dynamic import EvmProvider to avoid SSR issues with wagmi/RainbowKit
const EvmProviderWrapper = dynamic(
  () => import('@/lib/wallet/evmProvider').then((mod) => mod.EvmProvider),
  { ssr: false },
);

const VechainProviderWrapper = dynamic(() => import('@/lib/wallet/vechainProvider').then((mod) => mod.VechainProvider), { ssr: false });

const TonProviderWrapper = dynamic(() => import('@/lib/wallet/tonProvider').then((mod) => mod.TonProvider), { ssr: false });

const AptosProviderWrapper = dynamic(() => import('@/lib/wallet/aptosProvider').then((mod) => mod.AptosProvider), { ssr: false });

const SuiProviderWrapper = dynamic(
  () => import('@/lib/wallet/suiProvider').then((mod) => mod.SuiProvider),
  { ssr: false },
);

const IotaProviderWrapper = dynamic(
  () => import('@/lib/wallet/iotaProvider').then((mod) => mod.IotaProvider),
  { ssr: false },
);

const AlgorandProviderWrapper = dynamic(
  () => import('@/lib/wallet/algorandProvider').then((mod) => mod.AlgorandProvider),
  { ssr: false },
);

const CosmosProviderWrapper = dynamic(
  () => import('@/lib/wallet/cosmosProvider').then((mod) => mod.CosmosProvider),
  { ssr: false },
);

// Dynamic import KlipApprovalDialog to avoid SSR issues
const KlipApprovalDialog = dynamic(
  () => import('@/components/common/KlipApprovalDialog').then((mod) => mod.KlipApprovalDialog),
  { ssr: false },
);

type ProvidersProps = {
  children: ReactNode;
};

const Providers = ({ children }: ProvidersProps) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 2,
          },
        },
      }),
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WalletProviderWrapper>
            <EvmProviderWrapper>
              <CosmosProviderWrapper>
                <AlgorandProviderWrapper>
                  <IotaProviderWrapper>
                    <SuiProviderWrapper>
                      <AptosProviderWrapper>
                      <TonProviderWrapper><VechainProviderWrapper>{children}</VechainProviderWrapper></TonProviderWrapper>
                      <KlipApprovalDialog />
                      </AptosProviderWrapper>
                    </SuiProviderWrapper>
                  </IotaProviderWrapper>
                </AlgorandProviderWrapper>
              </CosmosProviderWrapper>
            </EvmProviderWrapper>
          </WalletProviderWrapper>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export { Providers };
