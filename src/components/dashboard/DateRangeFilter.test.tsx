import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DateRangeFilter } from './DateRangeFilter';

describe('DateRangeFilter', () => {
  const defaultProps = {
    preset: '30d' as const,
    startDate: new Date('2024-05-16'),
    endDate: new Date('2024-06-15'),
    onPresetChange: vi.fn(),
    onCustomRangeChange: vi.fn(),
  };

  it('should render all preset buttons', () => {
    render(<DateRangeFilter {...defaultProps} />);

    expect(screen.getByText('최근 7일')).toBeInTheDocument();
    expect(screen.getByText('최근 30일')).toBeInTheDocument();
    expect(screen.getByText('최근 90일')).toBeInTheDocument();
  });

  it('should highlight active preset button', () => {
    render(<DateRangeFilter {...defaultProps} preset="30d" />);

    const activeButton = screen.getByTestId('preset-30d');
    expect(activeButton).toHaveClass('bg-primary');
  });

  it('should call onPresetChange when preset button clicked', () => {
    const onPresetChange = vi.fn();
    render(<DateRangeFilter {...defaultProps} onPresetChange={onPresetChange} />);

    fireEvent.click(screen.getByTestId('preset-7d'));

    expect(onPresetChange).toHaveBeenCalledWith('7d');
  });

  it('should render date inputs with correct values', () => {
    render(<DateRangeFilter {...defaultProps} />);

    const startInput = screen.getByTestId('start-date-input') as HTMLInputElement;
    const endInput = screen.getByTestId('end-date-input') as HTMLInputElement;

    expect(startInput.value).toBe('2024-05-16');
    expect(endInput.value).toBe('2024-06-15');
  });

  it('should call onCustomRangeChange when start date changes', () => {
    const onCustomRangeChange = vi.fn();
    render(<DateRangeFilter {...defaultProps} onCustomRangeChange={onCustomRangeChange} />);

    fireEvent.change(screen.getByTestId('start-date-input'), {
      target: { value: '2024-04-01' },
    });

    expect(onCustomRangeChange).toHaveBeenCalledTimes(1);
    expect(onCustomRangeChange.mock.calls[0]![0]).toEqual(new Date('2024-04-01T00:00:00'));
    expect(onCustomRangeChange.mock.calls[0]![1]).toEqual(defaultProps.endDate);
  });

  it('should call onCustomRangeChange when end date changes', () => {
    const onCustomRangeChange = vi.fn();
    render(<DateRangeFilter {...defaultProps} onCustomRangeChange={onCustomRangeChange} />);

    fireEvent.change(screen.getByTestId('end-date-input'), {
      target: { value: '2024-07-01' },
    });

    expect(onCustomRangeChange).toHaveBeenCalledTimes(1);
    expect(onCustomRangeChange.mock.calls[0]![0]).toEqual(defaultProps.startDate);
    expect(onCustomRangeChange.mock.calls[0]![1]).toEqual(new Date('2024-07-01T23:59:59'));
  });

  it('should not call onCustomRangeChange when date input is cleared', () => {
    const onCustomRangeChange = vi.fn();
    render(<DateRangeFilter {...defaultProps} onCustomRangeChange={onCustomRangeChange} />);

    fireEvent.change(screen.getByTestId('start-date-input'), {
      target: { value: '' },
    });

    expect(onCustomRangeChange).not.toHaveBeenCalled();
  });

  it('should show non-active presets with secondary style', () => {
    render(<DateRangeFilter {...defaultProps} preset="30d" />);

    const button7d = screen.getByTestId('preset-7d');
    expect(button7d).toHaveClass('bg-secondary');
  });
});
