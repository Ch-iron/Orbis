'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { LayoutDashboard, Coins, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChainStore } from '@/stores/chainStore';

const Sidebar = () => {
  const pathname = usePathname();
  const selectedChainSlug = useChainStore((state) => state.selectedChainSlug);

  const navItems = [
    { href: '/portfolio', label: 'Portfolio', icon: LayoutDashboard },
    { href: `/stake/${selectedChainSlug}`, label: 'Stake', icon: Coins },
    { href: '/history', label: 'History', icon: History },
  ];

  return (
    <aside className='hidden md:flex flex-col w-60 border-r border-border bg-card h-screen sticky top-0'>
      <div className='flex items-center gap-2 px-6 py-4'>
        <Image src='/logo.svg' alt='SquirrelStake' width={28} height={28} />
        <span className='text-lg font-bold'>SquirrelStake</span>
      </div>
      <nav className='flex flex-col gap-1 p-3 flex-1'>
        {navItems.map((item) => {
          const isActive = pathname.startsWith(
            item.href.split('/').slice(0, 2).join('/'),
          );
          return (
            <Link
              key={item.label}
              href={item.href}
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
      <div className='relative flex justify-center pb-4 px-4 mb-20 opacity-60'>
        <Image
          src='/leaf.svg'
          alt=''
          width={20}
          height={20}
          className='absolute top-0 left-6 w-5 h-5 opacity-40 -rotate-45'
        />
        <Image
          src='/acorn.svg'
          alt=''
          width={16}
          height={16}
          className='absolute top-2 right-6 w-4 h-4 opacity-40 rotate-12'
        />
        <Image
          src='/leaf.svg'
          alt=''
          width={16}
          height={16}
          className='absolute bottom-2 right-10 w-4 h-4 opacity-30 rotate-90'
        />
        <Image
          src='/mascot.svg'
          alt='SquirrelStake mascot'
          width={80}
          height={80}
        />
      </div>
    </aside>
  );
};

export { Sidebar };
