import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SpendTrendChart } from './SpendTrendChart';
import type { DailyMetricsData } from './SpendTrendChart';

// Mock recharts to avoid canvas issues in jsdom
vi.mock('recharts', () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Line: ({ dataKey }: { dataKey: string }) => <div data-testid={`line-${dataKey}`} />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Legend: () => <div data-testid="legend" />,
}));

const sampleData: DailyMetricsData[] = [
  { date: '2024-06-01', spend: 100, impressions: 5000, clicks: 200, conversions: 10, revenue: 500 },
  { date: '2024-06-02', spend: 150, impressions: 6000, clicks: 250, conversions: 15, revenue: 600 },
];

describe('SpendTrendChart', () => {
  it('should render chart with data', () => {
    render(<SpendTrendChart data={sampleData} />);

    expect(screen.getByText('Daily Trend')).toBeInTheDocument();
    expect(screen.getByTestId('trend-chart')).toBeInTheDocument();
  });

  it('should render empty state when no data', () => {
    render(<SpendTrendChart data={[]} />);

    expect(screen.getByTestId('empty-trend')).toHaveTextContent('No data available');
  });

  it('should render metric toggle buttons', () => {
    render(<SpendTrendChart data={sampleData} />);

    expect(screen.getByTestId('metric-toggle-spend')).toBeInTheDocument();
    expect(screen.getByTestId('metric-toggle-impressions')).toBeInTheDocument();
    expect(screen.getByTestId('metric-toggle-clicks')).toBeInTheDocument();
  });

  it('should switch active metric on toggle click', () => {
    render(<SpendTrendChart data={sampleData} />);

    const impressionsBtn = screen.getByTestId('metric-toggle-impressions');
    fireEvent.click(impressionsBtn);

    expect(impressionsBtn).toHaveClass('bg-primary');
    expect(screen.getByTestId('line-impressions')).toBeInTheDocument();
  });

  it('should default to spend metric', () => {
    render(<SpendTrendChart data={sampleData} />);

    expect(screen.getByTestId('metric-toggle-spend')).toHaveClass('bg-primary');
    expect(screen.getByTestId('line-spend')).toBeInTheDocument();
  });
});
