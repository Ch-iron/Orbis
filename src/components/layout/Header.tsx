'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { WalletButton } from './WalletButton';
import { ThemeToggle } from './ThemeToggle';
import { TokenInfo } from '@/components/common/ChainSelector';
import { MobileNav } from './MobileNav';

const Header = () => {
  const pathname = usePathname();
  const [navigationOpen, setNavigationOpen] = useState(false);
  const isOverview = pathname === '/overview';

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          <Sheet open={navigationOpen} onOpenChange={setNavigationOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open navigation">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-60 p-0" aria-describedby={undefined}>
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <MobileNav onNavigate={() => setNavigationOpen(false)} />
            </SheetContent>
          </Sheet>
          {!isOverview && <div className="hidden md:block"><TokenInfo /></div>}
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <WalletButton />
        </div>
      </div>
      {!isOverview && <div className="px-4 pb-2 md:hidden"><TokenInfo /></div>}
    </header>
  );
};

export { Header };
