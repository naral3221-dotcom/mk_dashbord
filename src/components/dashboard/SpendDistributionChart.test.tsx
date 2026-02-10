import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SpendDistributionChart } from './SpendDistributionChart';
import type { SpendDistributionData } from './SpendDistributionChart';

vi.mock('recharts', () => ({
  PieChart: ({ children }: { children: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  Pie: ({ data }: { data: SpendDistributionData[] }) => (
    <div data-testid="pie" data-count={data.length}>
      {data.map((d, i) => (
        <div key={i} data-testid={`pie-segment-${d.campaignName}`} />
      ))}
    </div>
  ),
  Cell: () => <div data-testid="cell" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Legend: () => <div data-testid="legend" />,
}));

const sampleData: SpendDistributionData[] = [
  { campaignId: 'c1', campaignName: 'Campaign A', spend: 500 },
  { campaignId: 'c2', campaignName: 'Campaign B', spend: 300 },
  { campaignId: 'c3', campaignName: 'Campaign C', spend: 200 },
];

describe('SpendDistributionChart', () => {
  it('should render chart with data', () => {
    render(<SpendDistributionChart data={sampleData} />);

    expect(screen.getByText('Spend Distribution')).toBeInTheDocument();
    expect(screen.getByTestId('distribution-chart')).toBeInTheDocument();
  });

  it('should render empty state when no data', () => {
    render(<SpendDistributionChart data={[]} />);

    expect(screen.getByTestId('empty-distribution')).toHaveTextContent('No data available');
  });

  it('should render pie segments for each campaign', () => {
    render(<SpendDistributionChart data={sampleData} />);

    expect(screen.getByTestId('pie-segment-Campaign A')).toBeInTheDocument();
    expect(screen.getByTestId('pie-segment-Campaign B')).toBeInTheDocument();
    expect(screen.getByTestId('pie-segment-Campaign C')).toBeInTheDocument();
  });
});
