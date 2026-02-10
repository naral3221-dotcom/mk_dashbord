import type {
  AggregatedKpis,
  DailyMetrics,
  SpendByCampaign,
  GetDashboardOverviewOutput,
} from '@/domain/usecases/GetDashboardOverviewUseCase';
import type {
  CampaignPerformanceItem,
  GetCampaignPerformanceOutput,
} from '@/domain/usecases/GetCampaignPerformanceUseCase';

export interface DashboardOverviewResponse {
  kpis: AggregatedKpis;
  dailyTrend: DailyMetrics[];
  spendByCampaign: SpendByCampaign[];
}

export interface CampaignPerformanceResponse {
  campaigns: CampaignPerformanceItem[];
  totalCount: number;
}

export function toDashboardOverviewResponse(
  output: GetDashboardOverviewOutput,
): DashboardOverviewResponse {
  return {
    kpis: output.kpis,
    dailyTrend: output.dailyTrend,
    spendByCampaign: output.spendByCampaign,
  };
}

export function toCampaignPerformanceResponse(
  output: GetCampaignPerformanceOutput,
): CampaignPerformanceResponse {
  return {
    campaigns: output.campaigns,
    totalCount: output.totalCount,
  };
}
