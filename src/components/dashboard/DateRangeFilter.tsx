'use client';

import type { DatePreset } from '@/hooks/useDateRange';

export interface DateRangeFilterProps {
  preset: DatePreset;
  startDate: Date;
  endDate: Date;
  onPresetChange: (preset: DatePreset) => void;
  onCustomRangeChange: (startDate: Date, endDate: Date) => void;
}

const presetLabels: Record<Exclude<DatePreset, 'custom'>, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
};

function toDateInputValue(date: Date): string {
  return date.toISOString().split('T')[0]!;
}

export function DateRangeFilter({
  preset,
  startDate,
  endDate,
  onPresetChange,
  onCustomRangeChange,
}: DateRangeFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {(Object.keys(presetLabels) as Exclude<DatePreset, 'custom'>[]).map((p) => (
        <button
          key={p}
          type="button"
          data-testid={`preset-${p}`}
          onClick={() => onPresetChange(p)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            preset === p
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
          }`}
        >
          {presetLabels[p]}
        </button>
      ))}
      <div className="flex items-center gap-1">
        <input
          type="date"
          data-testid="start-date-input"
          value={toDateInputValue(startDate)}
          onChange={(e) => {
            if (e.target.value) {
              onCustomRangeChange(new Date(e.target.value + 'T00:00:00'), endDate);
            }
          }}
          className="rounded-md border px-2 py-1.5 text-sm"
        />
        <span className="text-sm text-muted-foreground">–</span>
        <input
          type="date"
          data-testid="end-date-input"
          value={toDateInputValue(endDate)}
          onChange={(e) => {
            if (e.target.value) {
              onCustomRangeChange(startDate, new Date(e.target.value + 'T23:59:59'));
            }
          }}
          className="rounded-md border px-2 py-1.5 text-sm"
        />
      </div>
    </div>
  );
}
