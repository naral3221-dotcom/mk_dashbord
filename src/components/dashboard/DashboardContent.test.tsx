import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DashboardContent } from './DashboardContent';

// Mock hooks
const mockUseDateRange = {
  startDate: new Date('2024-05-16'),
  endDate: new Date('2024-06-15'),
  preset: '30d' as const,
  setPreset: vi.fn(),
  setCustomRange: vi.fn(),
  toQueryParams: vi.fn().mockReturnValue('startDate=2024-05-16&endDate=2024-06-15'),
};

const mockUseDashboardData = {
  overview: null as ReturnType<typeof getMockOverview> | null,
  campaigns: null as ReturnType<typeof getMockCampaigns> | null,
  loading: false,
  error: null as string | null,
  refetch: vi.fn(),
};

function getMockOverview() {
  return {
    kpis: {
      totalSpend: 1000,
      totalImpressions: 50000,
      totalClicks: 2000,
      totalConversions: 100,
      totalRevenue: 5000,
      ctr: 4.0,
      cpc: 0.5,
      cpm: 20.0,
      cvr: 5.0,
      cpa: 10.0,
      roas: 5.0,
      roi: 400.0,
      profit: 4000,
    },
    dailyTrend: [],
    spendByCampaign: [],
  };
}

function getMockCampaigns() {
  return {
    campaigns: [
      {
        campaignId: 'c1',
        campaignName: 'Test Campaign',
        status: 'ACTIVE' as const,
        spend: 500,
        impressions: 10000,
        clicks: 300,
        conversions: 15,
        revenue: 1500,
        ctr: 3.0,
        cpc: 1.67,
        cpm: 50.0,
        cvr: 5.0,
        cpa: 33.33,
        roas: 3.0,
      },
    ],
    totalCount: 1,
  };
}

vi.mock('@/hooks/useDateRange', () => ({
  useDateRange: () => mockUseDateRange,
}));

vi.mock('@/hooks/useDashboardData', () => ({
  useDashboardData: () => mockUseDashboardData,
}));

// Mock recharts
vi.mock('recharts', () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Line: () => <div />,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Bar: () => <div />,
  PieChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Pie: () => <div />,
  Cell: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Legend: () => <div />,
}));

describe('DashboardContent', () => {
  beforeEach(() => {
    mockUseDashboardData.overview = null;
    mockUseDashboardData.campaigns = null;
    mockUseDashboardData.loading = false;
    mockUseDashboardData.error = null;
  });

  it('should render dashboard title', () => {
    render(<DashboardContent />);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('should render KPI cards with overview data', () => {
    mockUseDashboardData.overview = getMockOverview();
    render(<DashboardContent />);

    expect(screen.getByText('Total Spend')).toBeInTheDocument();
    expect(screen.getByText('Impressions')).toBeInTheDocument();
    expect(screen.getByText('Clicks')).toBeInTheDocument();
    expect(screen.getByText('ROAS')).toBeInTheDocument();
  });

  it('should render date range filter', () => {
    render(<DashboardContent />);

    expect(screen.getByText('Last 7 days')).toBeInTheDocument();
    expect(screen.getByText('Last 30 days')).toBeInTheDocument();
    expect(screen.getByText('Last 90 days')).toBeInTheDocument();
  });

  it('should render chart sections', () => {
    mockUseDashboardData.overview = getMockOverview();
    render(<DashboardContent />);

    expect(screen.getByText('Daily Trend')).toBeInTheDocument();
    expect(screen.getByText('Campaign Comparison')).toBeInTheDocument();
    expect(screen.getByText('Spend Distribution')).toBeInTheDocument();
  });

  it('should render campaign table', () => {
    mockUseDashboardData.campaigns = getMockCampaigns();
    render(<DashboardContent />);

    expect(screen.getByText('Campaign Performance')).toBeInTheDocument();
    expect(screen.getByText('Test Campaign')).toBeInTheDocument();
  });

  it('should show error message when error occurs', () => {
    mockUseDashboardData.error = 'Failed to load';
    render(<DashboardContent />);

    expect(screen.getByTestId('dashboard-error')).toHaveTextContent('Failed to load');
  });

  it('should show loading state in table', () => {
    mockUseDashboardData.loading = true;
    render(<DashboardContent />);

    expect(screen.getByTestId('table-loading')).toBeInTheDocument();
  });

  it('should render with zero values when no overview data', () => {
    render(<DashboardContent />);

    // KPI cards should render with 0 values
    expect(screen.getByText('Total Spend')).toBeInTheDocument();
  });
});
