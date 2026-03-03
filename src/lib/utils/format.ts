// Add thousand separators to a numeric string
const addThousandSeparator = (numberStr: string): string => {
  return numberStr.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

// Format raw token amount to human readable
// XPLA has 18 decimals, e.g. "1000000000000000000" axpla = "1.0" XPLA
const formatTokenAmount = (
  rawAmount: string,
  decimals: number,
  displayDecimals: number = 6,
): string => {
  if (!rawAmount || rawAmount === '0') {
    return '0';
  }

  const paddedAmount = rawAmount.padStart(decimals + 1, '0');
  const integerPart =
    paddedAmount.slice(0, paddedAmount.length - decimals) || '0';
  const decimalPart = paddedAmount.slice(
    paddedAmount.length - decimals,
    paddedAmount.length - decimals + displayDecimals,
  );

  // Remove trailing zeros from decimal part
  const trimmedDecimal = decimalPart.replace(/0+$/, '');

  if (!trimmedDecimal) {
    return addThousandSeparator(integerPart);
  }

  return `${addThousandSeparator(integerPart)}.${trimmedDecimal}`;
};

// Format a percentage value (0.05 -> "5.00%")
const formatPercentage = (
  value: number,
  decimals: number = 2,
): string => {
  return `${(value * 100).toFixed(decimals)}%`;
};

// Parse human-readable amount to raw token amount
const parseTokenAmount = (
  humanAmount: string,
  decimals: number,
): string => {
  const parts = humanAmount.split('.');
  const integerPart = parts[0] ?? '0';
  const decimalPart = (parts[1] ?? '').padEnd(decimals, '0').slice(0, decimals);
  const result =
    `${integerPart}${decimalPart}`.replace(/^0+/, '');
  return result || '0';
};

// Truncate address for display (e.g. "xpla1abc...xyz123")
const truncateAddress = (
  address: string,
  startChars: number = 8,
  endChars: number = 6,
): string => {
  if (address.length <= startChars + endChars) {
    return address;
  }

  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
};

export {
  formatTokenAmount,
  formatPercentage,
  parseTokenAmount,
  truncateAddress,
};
