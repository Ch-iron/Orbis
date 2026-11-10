'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useChainStore } from '@/stores/chainStore';
import { getNavItems } from '@/lib/navigation';
import { SidebarChainSelector } from '@/components/common/ChainSelector';

const MobileNav = ({ onNavigate }: { onNavigate: () => void }) => {
  const pathname = usePathname();
  const selectedChainSlug = useChainStore((state) => state.selectedChainSlug);
  const navItems = getNavItems(selectedChainSlug);

  const globalItems = navItems.filter((item) => item.group === 'global');
  const chainItems = navItems.filter((item) => item.group === 'chain');

  return (
    <div className='flex flex-col h-full'>
      <div className='flex items-center gap-2 px-6 py-5 border-b border-border'>
        <Image
          src='/logo.png'
          alt='Orbis'
          width={50}
          height={50}
          className='-mr-3'
        />
        <span className='text-lg font-bold'>ORBIS</span>
      </div>
      <nav className='flex flex-col gap-1 p-3 flex-1'>
        {globalItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={onNavigate}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/15 text-primary font-semibold'
                  : 'text-muted-foreground hover:bg-primary/5 hover:text-foreground',
              )}
            >
              <item.icon className='h-4 w-4' />
              {item.label}
            </Link>
          );
        })}

        {/* Chain section divider */}
        <div className='border-t border-border mx-3 mt-3' />
        <div className='px-3 pt-3 pb-1 flex flex-col gap-1.5'>
          <span className='text-[11px] text-muted-foreground uppercase tracking-wider px-0.5'>Chain Staking Status</span>
          <SidebarChainSelector />
        </div>

        {chainItems.map((item) => {
          const isActive = pathname.startsWith(
            item.href.split('/').slice(0, 2).join('/'),
          );
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={onNavigate}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/15 text-primary font-semibold'
                  : 'text-muted-foreground hover:bg-primary/5 hover:text-foreground',
              )}
            >
              <item.icon className='h-4 w-4' />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export { MobileNav };
