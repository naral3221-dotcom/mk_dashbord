import { GetDashboardOverviewUseCase } from '@/domain/usecases/GetDashboardOverviewUseCase';
import { GetCampaignPerformanceUseCase } from '@/domain/usecases/GetCampaignPerformanceUseCase';
import {
  DashboardOverviewResponse,
  CampaignPerformanceResponse,
  toDashboardOverviewResponse,
  toCampaignPerformanceResponse,
} from '../dto/DashboardDTO';

export class DashboardService {
  constructor(
    private readonly getOverviewUseCase: GetDashboardOverviewUseCase,
    private readonly getCampaignPerformanceUseCase: GetCampaignPerformanceUseCase,
  ) {}

  async getOverview(
    organizationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<DashboardOverviewResponse> {
    const result = await this.getOverviewUseCase.execute({
      organizationId,
      startDate,
      endDate,
    });
    return toDashboardOverviewResponse(result);
  }

  async getCampaignPerformance(
    organizationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<CampaignPerformanceResponse> {
    const result = await this.getCampaignPerformanceUseCase.execute({
      organizationId,
      startDate,
      endDate,
    });
    return toCampaignPerformanceResponse(result);
  }
}
