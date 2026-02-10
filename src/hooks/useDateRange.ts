'use client';

import { useState, useCallback, useMemo } from 'react';

export type DatePreset = '7d' | '30d' | '90d' | 'custom';

export interface DateRangeState {
  startDate: Date;
  endDate: Date;
  preset: DatePreset;
}

export interface UseDateRangeReturn {
  startDate: Date;
  endDate: Date;
  preset: DatePreset;
  setPreset: (preset: DatePreset) => void;
  setCustomRange: (startDate: Date, endDate: Date) => void;
  toQueryParams: () => string;
}

function getPresetDates(preset: Exclude<DatePreset, 'custom'>): { startDate: Date; endDate: Date } {
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);

  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);

  switch (preset) {
    case '7d':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(startDate.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(startDate.getDate() - 90);
      break;
  }

  return { startDate, endDate };
}

export function useDateRange(initialPreset: DatePreset = '30d'): UseDateRangeReturn {
  const [state, setState] = useState<DateRangeState>(() => {
    if (initialPreset === 'custom') {
      const { startDate, endDate } = getPresetDates('30d');
      return { startDate, endDate, preset: 'custom' as DatePreset };
    }
    const { startDate, endDate } = getPresetDates(initialPreset);
    return { startDate, endDate, preset: initialPreset };
  });

  const setPreset = useCallback((preset: DatePreset) => {
    if (preset === 'custom') {
      setState((prev) => ({ ...prev, preset: 'custom' }));
      return;
    }
    const { startDate, endDate } = getPresetDates(preset);
    setState({ startDate, endDate, preset });
  }, []);

  const setCustomRange = useCallback((startDate: Date, endDate: Date) => {
    setState({ startDate, endDate, preset: 'custom' });
  }, []);

  const toQueryParams = useCallback(() => {
    const params = new URLSearchParams({
      startDate: state.startDate.toISOString(),
      endDate: state.endDate.toISOString(),
    });
    return params.toString();
  }, [state.startDate, state.endDate]);

  return useMemo(
    () => ({
      startDate: state.startDate,
      endDate: state.endDate,
      preset: state.preset,
      setPreset,
      setCustomRange,
      toQueryParams,
    }),
    [state, setPreset, setCustomRange, toQueryParams],
  );
}
