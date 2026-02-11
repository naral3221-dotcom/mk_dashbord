import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CampaignComparisonChart } from './CampaignComparisonChart';
import type { CampaignComparisonData } from './CampaignComparisonChart';

vi.mock('recharts', () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: ({ dataKey }: { dataKey: string }) => <div data-testid={`bar-${dataKey}`} />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Legend: () => <div data-testid="legend" />,
}));

const sampleData: CampaignComparisonData[] = [
  { campaignId: 'c1', campaignName: 'Campaign A', spend: 500, conversions: 25, roas: 3.5 },
  { campaignId: 'c2', campaignName: 'Campaign B', spend: 300, conversions: 15, roas: 2.0 },
];

describe('CampaignComparisonChart', () => {
  it('should render chart with data', () => {
    render(<CampaignComparisonChart data={sampleData} />);

    expect(screen.getByText('캠페인 비교')).toBeInTheDocument();
    expect(screen.getByTestId('comparison-chart')).toBeInTheDocument();
  });

  it('should render empty state when no data', () => {
    render(<CampaignComparisonChart data={[]} />);

    expect(screen.getByTestId('empty-comparison')).toHaveTextContent('데이터 없음');
  });

  it('should render metric toggle buttons', () => {
    render(<CampaignComparisonChart data={sampleData} />);

    expect(screen.getByTestId('comparison-toggle-spend')).toBeInTheDocument();
    expect(screen.getByTestId('comparison-toggle-conversions')).toBeInTheDocument();
    expect(screen.getByTestId('comparison-toggle-roas')).toBeInTheDocument();
  });

  it('should switch metric on toggle click', () => {
    render(<CampaignComparisonChart data={sampleData} />);

    fireEvent.click(screen.getByTestId('comparison-toggle-conversions'));

    expect(screen.getByTestId('comparison-toggle-conversions')).toHaveClass('bg-primary');
    expect(screen.getByTestId('bar-conversions')).toBeInTheDocument();
  });

  it('should default to spend metric', () => {
    render(<CampaignComparisonChart data={sampleData} />);

    expect(screen.getByTestId('comparison-toggle-spend')).toHaveClass('bg-primary');
    expect(screen.getByTestId('bar-spend')).toBeInTheDocument();
  });
});
