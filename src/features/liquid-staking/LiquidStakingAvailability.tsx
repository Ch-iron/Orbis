const unavailable: Record<string, { message: string; href?: string; source?: string }> = {
  sei: { message: 'Liquid staking is currently unavailable in Orbis for Sei. Silo has announced its wind-down.', href: 'https://app.silostaking.io/', source: 'Silo status' },
  celestia: { message: 'Liquid staking is currently unavailable in Orbis for Celestia. Stride has closed new deposits and redemptions as part of its wind-down.', href: 'https://app.stride.zone/', source: 'Stride status' },
  dydx: { message: 'Liquid staking is currently unavailable in Orbis for dYdX. Stride and Quicksilver have disabled new liquid staking.', href: 'https://app.quicksilver.zone/staking', source: 'Quicksilver status' },
  cardano: { message: 'Cardano pool delegation keeps ADA spendable in your wallet. No separate liquid staking platform is integrated.' },
  vechain: { message: 'Use StarGate staking NFTs below. No separate liquid staking platform is integrated for VeChain.' },
  xpla: { message: 'Validator staking is available below. No liquid staking platform is currently integrated for XPLA.' },
};

export function LiquidStakingAvailability({ chainId }: { chainId: string }) {
  const notice = unavailable[chainId];
  if (!notice) return null;
  return <div className="mb-4 rounded-lg border p-4 text-sm text-muted-foreground"><p>{notice.message}</p>{notice.href && <a className="mt-2 inline-block underline" href={notice.href} target="_blank" rel="noreferrer">{notice.source}</a>}</div>;
}
