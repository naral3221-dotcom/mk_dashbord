import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/infrastructure/auth/nextauth.config';
import { Platform } from '@/domain/entities/types';
import { handleApiError } from '@/lib/apiErrorHandler';

function getService() {
  const getPrisma = require('@/infrastructure/database/prisma').default;
  const { PrismaAdAccountRepository } = require('@/infrastructure/repositories/PrismaAdAccountRepository');
  const { PrismaCampaignRepository } = require('@/infrastructure/repositories/PrismaCampaignRepository');
  const { PrismaCampaignInsightRepository } = require('@/infrastructure/repositories/PrismaCampaignInsightRepository');
  const { GetDashboardOverviewUseCase } = require('@/domain/usecases/GetDashboardOverviewUseCase');
  const { DashboardService } = require('@/application/services/DashboardService');
  const { GetCampaignPerformanceUseCase } = require('@/domain/usecases/GetCampaignPerformanceUseCase');

  const prisma = getPrisma();
  const adAccountRepo = new PrismaAdAccountRepository(prisma);
  const campaignRepo = new PrismaCampaignRepository(prisma);
  const insightRepo = new PrismaCampaignInsightRepository(prisma);

  const overviewUseCase = new GetDashboardOverviewUseCase(
    adAccountRepo,
    campaignRepo,
    insightRepo,
  );
  const campaignPerformanceUseCase = new GetCampaignPerformanceUseCase(
    adAccountRepo,
    campaignRepo,
    insightRepo,
  );

  return new DashboardService(overviewUseCase, campaignPerformanceUseCase);
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const organizationId = (session.user as Record<string, unknown>).organizationId as string | undefined;
    if (!organizationId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    const startDate = startDateStr ? new Date(startDateStr) : thirtyDaysAgo;
    const endDate = endDateStr ? new Date(endDateStr) : now;

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }

    const platformParam = searchParams.get('platform');
    const platform = platformParam && Object.values(Platform).includes(platformParam as Platform)
      ? (platformParam as Platform)
      : undefined;

    const service = getService();
    const result = await service.getOverview(organizationId, startDate, endDate, platform);
    return NextResponse.json(result);
  } catch (error) {
    const { body, status } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
