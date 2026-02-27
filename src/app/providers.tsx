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
    <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WalletProviderWrapper>{children}</WalletProviderWrapper>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export { Providers };
