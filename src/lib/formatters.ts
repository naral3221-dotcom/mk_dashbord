/**
 * Format as currency: $1,234.56
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

/**
 * Format number with commas: 12,345
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

/**
 * Format as percentage: 5.23%
 * Value is already a percentage (e.g., 5.23 means 5.23%)
 */
export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

/**
 * Format as ratio: 2.50x
 */
export function formatRatio(value: number): string {
  return `${value.toFixed(2)}x`;
}

/**
 * Format large numbers compactly: 1.2K, 3.4M, 1.5B
 */
export function formatCompactNumber(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return `${Math.round(value)}`;
}

/**
 * Format date as MM/DD: 01/15
 * Input is YYYY-MM-DD string
 */
export function formatDate(dateStr: string): string {
  const [, month, day] = dateStr.split('-');
  return `${month}/${day}`;
}
