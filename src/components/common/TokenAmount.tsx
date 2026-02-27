'use client';

import { formatTokenAmount } from '@/lib/utils/format';

type TokenAmountProps = {
  amount: string;
  decimals: number;
  symbol?: string;
  displayDecimals?: number;
  className?: string;
};

const TokenAmount = ({ amount, decimals, symbol, displayDecimals = 6, className }: TokenAmountProps) => {
  const formatted = formatTokenAmount(amount, decimals, displayDecimals);

  return (
    <span className={className}>
      {formatted}
      {symbol && <span className="ml-1 text-muted-foreground">{symbol}</span>}
    </span>
  );
};

export { TokenAmount };
export type { TokenAmountProps };
