import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { CHAIN_REGISTRY } from '@/lib/chains/registry';

const CHAIN_DESCRIPTIONS: Record<string, string> = {
  xpla: 'Gaming & entertainment-focused L1 with EVM compatibility.',
  sei: 'The fastest L1 blockchain optimized for trading.',
  kaia: "Asia's largest Web3 ecosystem built by Kakao & LINE.",
};

export function ChainsSection() {
  const chains = Object.values(CHAIN_REGISTRY);

  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <h2 className="mb-4 text-center text-3xl font-bold sm:text-4xl">
        Supported Chains
      </h2>
      <p className="mx-auto mb-12 max-w-2xl text-center text-muted-foreground">
        Stake on leading Cosmos &amp; EVM chains with a single interface.
      </p>

      <div className="flex flex-wrap items-stretch justify-center gap-8">
        {chains.map((chain) => (
          <div
            key={chain.slug}
            className="flex w-[240px] flex-col items-center gap-3 rounded-xl border bg-card p-8 shadow-sm dark:bg-card/60 dark:shadow-none backdrop-blur-sm transition-transform duration-200 hover:scale-105"
          >
            <Image
              src={chain.logo}
              alt={chain.name}
              width={56}
              height={56}
              className="rounded-full"
            />
            <span className="text-lg font-semibold">{chain.name}</span>
            <span className="max-w-[200px] text-center text-sm text-muted-foreground">
              {CHAIN_DESCRIPTIONS[chain.slug] ?? ''}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-8 flex justify-center">
        <Badge variant="secondary" className="text-sm">
          More chains coming soon
        </Badge>
      </div>
    </section>
  );
}
