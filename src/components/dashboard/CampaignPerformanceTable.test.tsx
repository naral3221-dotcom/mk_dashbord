import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { CampaignPerformanceTable } from './CampaignPerformanceTable';
import type { CampaignRowData } from './CampaignPerformanceTable';

const sampleData: CampaignRowData[] = [
  {
    campaignId: 'c1',
    campaignName: 'Alpha Campaign',
    status: 'ACTIVE',
    spend: 500,
    impressions: 10000,
    clicks: 300,
    conversions: 15,
    revenue: 1500,
    ctr: 3.0,
    cpc: 1.67,
    roas: 3.0,
  },
  {
    campaignId: 'c2',
    campaignName: 'Beta Campaign',
    status: 'PAUSED',
    spend: 800,
    impressions: 20000,
    clicks: 500,
    conversions: 25,
    revenue: 2000,
    ctr: 2.5,
    cpc: 1.6,
    roas: 2.5,
  },
  {
    campaignId: 'c3',
    campaignName: 'Gamma Campaign',
    status: 'ARCHIVED',
    spend: 200,
    impressions: 5000,
    clicks: 100,
    conversions: 5,
    revenue: 400,
    ctr: 2.0,
    cpc: 2.0,
    roas: 2.0,
  },
];

describe('CampaignPerformanceTable', () => {
  it('should render table with campaign data', () => {
    render(<CampaignPerformanceTable data={sampleData} />);

    expect(screen.getByText('Campaign Performance')).toBeInTheDocument();
    expect(screen.getByText('Alpha Campaign')).toBeInTheDocument();
    expect(screen.getByText('Beta Campaign')).toBeInTheDocument();
    expect(screen.getByText('Gamma Campaign')).toBeInTheDocument();
  });

  it('should render column headers', () => {
    render(<CampaignPerformanceTable data={sampleData} />);

    expect(screen.getByTestId('sort-name')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByTestId('sort-spend')).toBeInTheDocument();
    expect(screen.getByTestId('sort-impressions')).toBeInTheDocument();
    expect(screen.getByTestId('sort-clicks')).toBeInTheDocument();
    expect(screen.getByTestId('sort-conversions')).toBeInTheDocument();
    expect(screen.getByTestId('sort-revenue')).toBeInTheDocument();
    expect(screen.getByTestId('sort-ctr')).toBeInTheDocument();
    expect(screen.getByTestId('sort-cpc')).toBeInTheDocument();
    expect(screen.getByTestId('sort-roas')).toBeInTheDocument();
  });

  it('should display formatted values', () => {
    render(<CampaignPerformanceTable data={sampleData} />);

    const row1 = screen.getByTestId('campaign-row-c1');
    expect(within(row1).getByText('$500.00')).toBeInTheDocument();
    expect(within(row1).getByText('10,000')).toBeInTheDocument();
    expect(within(row1).getByText('3.00%')).toBeInTheDocument();
    expect(within(row1).getByText('3.00x')).toBeInTheDocument();
  });

  it('should render status badges', () => {
    render(<CampaignPerformanceTable data={sampleData} />);

    expect(screen.getByText('ACTIVE')).toHaveClass('bg-green-100');
    expect(screen.getByText('PAUSED')).toHaveClass('bg-yellow-100');
    expect(screen.getByText('ARCHIVED')).toHaveClass('bg-gray-100');
  });

  it('should sort by spend descending by default', () => {
    render(<CampaignPerformanceTable data={sampleData} />);

    const rows = screen.getAllByTestId(/^campaign-row-/);
    expect(rows[0]).toHaveAttribute('data-testid', 'campaign-row-c2');
    expect(rows[1]).toHaveAttribute('data-testid', 'campaign-row-c1');
    expect(rows[2]).toHaveAttribute('data-testid', 'campaign-row-c3');
  });

  it('should toggle sort direction when clicking same column', () => {
    render(<CampaignPerformanceTable data={sampleData} />);

    // Already sorted by spend desc, click spend again for asc
    fireEvent.click(screen.getByTestId('sort-spend'));

    const rows = screen.getAllByTestId(/^campaign-row-/);
    expect(rows[0]).toHaveAttribute('data-testid', 'campaign-row-c3');
    expect(rows[2]).toHaveAttribute('data-testid', 'campaign-row-c2');
  });

  it('should sort by different column', () => {
    render(<CampaignPerformanceTable data={sampleData} />);

    fireEvent.click(screen.getByTestId('sort-name'));

    // Default to desc for new column, so Z first
    const rows = screen.getAllByTestId(/^campaign-row-/);
    expect(rows[0]).toHaveAttribute('data-testid', 'campaign-row-c3'); // Gamma
    expect(rows[2]).toHaveAttribute('data-testid', 'campaign-row-c1'); // Alpha
  });

  it('should show loading state', () => {
    render(<CampaignPerformanceTable data={[]} loading />);

    expect(screen.getByTestId('table-loading')).toHaveTextContent('Loading...');
  });

  it('should show empty state when no data', () => {
    render(<CampaignPerformanceTable data={[]} />);

    expect(screen.getByTestId('table-empty')).toHaveTextContent('No campaigns found');
  });

  it('should show sort indicator on active column', () => {
    render(<CampaignPerformanceTable data={sampleData} />);

    expect(screen.getByTestId('sort-spend')).toHaveTextContent('Spend ↓');
  });
});
