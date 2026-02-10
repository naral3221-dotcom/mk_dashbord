import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDateRange } from './useDateRange';
import type { DatePreset } from './useDateRange';

describe('useDateRange', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with 30d preset by default', () => {
    const { result } = renderHook(() => useDateRange());

    expect(result.current.preset).toBe('30d');
    expect(result.current.startDate.getDate()).toBe(
      new Date('2024-05-16T00:00:00.000Z').getDate(),
    );
  });

  it('should initialize with specified preset', () => {
    const { result } = renderHook(() => useDateRange('7d'));

    expect(result.current.preset).toBe('7d');
  });

  it('should initialize with custom preset using 30d dates', () => {
    const { result } = renderHook(() => useDateRange('custom'));

    expect(result.current.preset).toBe('custom');
  });

  it('should change to 7d preset', () => {
    const { result } = renderHook(() => useDateRange('30d'));

    act(() => {
      result.current.setPreset('7d');
    });

    expect(result.current.preset).toBe('7d');
  });

  it('should change to 90d preset', () => {
    const { result } = renderHook(() => useDateRange('7d'));

    act(() => {
      result.current.setPreset('90d');
    });

    expect(result.current.preset).toBe('90d');
  });

  it('should set custom range', () => {
    const { result } = renderHook(() => useDateRange());
    const customStart = new Date('2024-01-01');
    const customEnd = new Date('2024-03-31');

    act(() => {
      result.current.setCustomRange(customStart, customEnd);
    });

    expect(result.current.preset).toBe('custom');
    expect(result.current.startDate).toEqual(customStart);
    expect(result.current.endDate).toEqual(customEnd);
  });

  it('should switch to custom preset without changing dates when setPreset("custom") is called', () => {
    const { result } = renderHook(() => useDateRange('30d'));
    const startBefore = result.current.startDate;
    const endBefore = result.current.endDate;

    act(() => {
      result.current.setPreset('custom');
    });

    expect(result.current.preset).toBe('custom');
    expect(result.current.startDate).toEqual(startBefore);
    expect(result.current.endDate).toEqual(endBefore);
  });

  it('should generate query params string', () => {
    const { result } = renderHook(() => useDateRange('30d'));

    const params = result.current.toQueryParams();

    expect(params).toContain('startDate=');
    expect(params).toContain('endDate=');
    expect(params).toContain('&');
  });

  it('should update query params when preset changes', () => {
    const { result } = renderHook(() => useDateRange('30d'));
    const paramsBefore = result.current.toQueryParams();

    act(() => {
      result.current.setPreset('7d');
    });

    const paramsAfter = result.current.toQueryParams();
    expect(paramsAfter).not.toBe(paramsBefore);
  });

  it('should update query params when custom range is set', () => {
    const { result } = renderHook(() => useDateRange('30d'));

    act(() => {
      result.current.setCustomRange(
        new Date('2024-01-01'),
        new Date('2024-01-31'),
      );
    });

    const params = result.current.toQueryParams();
    expect(params).toContain('2024-01-01');
    expect(params).toContain('2024-01-31');
  });

  it('should return stable references for callbacks', () => {
    const { result, rerender } = renderHook(() => useDateRange('30d'));

    const setPreset1 = result.current.setPreset;
    const setCustomRange1 = result.current.setCustomRange;

    rerender();

    expect(result.current.setPreset).toBe(setPreset1);
    expect(result.current.setCustomRange).toBe(setCustomRange1);
  });

  it('should handle switching between presets multiple times', () => {
    const { result } = renderHook(() => useDateRange('30d'));

    act(() => {
      result.current.setPreset('7d');
    });
    expect(result.current.preset).toBe('7d');

    act(() => {
      result.current.setPreset('90d');
    });
    expect(result.current.preset).toBe('90d');

    act(() => {
      result.current.setPreset('30d');
    });
    expect(result.current.preset).toBe('30d');
  });

  it('should have endDate after startDate for all presets', () => {
    const presets: DatePreset[] = ['7d', '30d', '90d'];

    for (const preset of presets) {
      const { result } = renderHook(() => useDateRange(preset));
      expect(result.current.endDate.getTime()).toBeGreaterThan(
        result.current.startDate.getTime(),
      );
    }
  });
});
