'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { LayoutDashboard, Coins, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChainStore } from '@/stores/chainStore';

const MobileNav = () => {
  const pathname = usePathname();
  const selectedChainSlug = useChainStore((state) => state.selectedChainSlug);

  const navItems = [
    { href: '/portfolio', label: 'Portfolio', icon: LayoutDashboard },
    { href: `/stake/${selectedChainSlug}`, label: 'Stake', icon: Coins },
    { href: '/history', label: 'History', icon: History },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-6 py-5 border-b border-border">
        <Image src="/logo.svg" alt="SquirrelStake" width={28} height={28} />
        <span className="text-lg font-bold">SquirrelStake</span>
      </div>
      <nav className="flex flex-col gap-1 p-3 flex-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href.split('/').slice(0, 2).join('/'));
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/15 text-primary font-semibold'
                  : 'text-muted-foreground hover:bg-primary/5 hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export { MobileNav };
