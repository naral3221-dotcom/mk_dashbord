import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/infrastructure/auth/nextauth.config';

function getService() {
  const { PrismaClient } = require('@/generated/prisma');
  const { PrismaAdAccountRepository } = require('@/infrastructure/repositories/PrismaAdAccountRepository');
  const { PrismaCampaignRepository } = require('@/infrastructure/repositories/PrismaCampaignRepository');
  const { PrismaCampaignInsightRepository } = require('@/infrastructure/repositories/PrismaCampaignInsightRepository');
  const { GetDashboardOverviewUseCase } = require('@/domain/usecases/GetDashboardOverviewUseCase');
  const { DashboardService } = require('@/application/services/DashboardService');
  const { GetCampaignPerformanceUseCase } = require('@/domain/usecases/GetCampaignPerformanceUseCase');

  const prisma = new PrismaClient();
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

    const service = getService();
    const result = await service.getOverview(organizationId, startDate, endDate);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
