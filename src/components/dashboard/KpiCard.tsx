'use client';

import { Card, CardContent } from '@/components/ui/card';
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatRatio,
  formatCompactNumber,
} from '@/lib/formatters';

export type KpiFormat = 'currency' | 'number' | 'percent' | 'ratio' | 'compact';

export interface KpiCardProps {
  label: string;
  value: number;
  format: KpiFormat;
  changePercent?: number;
}

function formatValue(value: number, format: KpiFormat): string {
  switch (format) {
    case 'currency':
      return formatCurrency(value);
    case 'number':
      return formatNumber(value);
    case 'percent':
      return formatPercent(value);
    case 'ratio':
      return formatRatio(value);
    case 'compact':
      return formatCompactNumber(value);
  }
}

export function KpiCard({ label, value, format, changePercent }: KpiCardProps) {
  const formattedValue = formatValue(value, format);
  const isPositive = changePercent !== undefined && changePercent > 0;
  const isNegative = changePercent !== undefined && changePercent < 0;

  return (
    <Card>
      <CardContent>
        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold" data-testid="kpi-value">
              {formattedValue}
            </span>
            {changePercent !== undefined && (
              <span
                data-testid="kpi-change"
                className={`text-sm font-medium ${
                  isPositive
                    ? 'text-green-600'
                    : isNegative
                      ? 'text-red-600'
                      : 'text-muted-foreground'
                }`}
              >
                {isPositive ? '↑' : isNegative ? '↓' : ''}
                {Math.abs(changePercent).toFixed(1)}%
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
