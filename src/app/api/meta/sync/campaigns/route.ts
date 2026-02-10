import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/infrastructure/auth/nextauth.config';

function getService() {
  const { PrismaClient } = require('@/generated/prisma');
  const { PrismaAdAccountRepository } = require('@/infrastructure/repositories/PrismaAdAccountRepository');
  const { PrismaCampaignRepository } = require('@/infrastructure/repositories/PrismaCampaignRepository');
  const { MetaApiClient } = require('@/infrastructure/external/meta/MetaApiClient');
  const { AesTokenEncryption } = require('@/infrastructure/encryption/AesTokenEncryption');
  const { SyncMetaCampaignsUseCase } = require('@/domain/usecases/SyncMetaCampaignsUseCase');
  const { MetaSyncService } = require('@/application/services/MetaSyncService');
  const { SyncMetaInsightsUseCase } = require('@/domain/usecases/SyncMetaInsightsUseCase');
  const { PrismaCampaignInsightRepository } = require('@/infrastructure/repositories/PrismaCampaignInsightRepository');
  const { InMemoryCacheService } = require('@/infrastructure/cache/InMemoryCacheService');

  const prisma = new PrismaClient();
  const adAccountRepo = new PrismaAdAccountRepository(prisma);
  const campaignRepo = new PrismaCampaignRepository(prisma);
  const insightRepo = new PrismaCampaignInsightRepository(prisma);
  const metaApiClient = new MetaApiClient(
    process.env.META_APP_ID!,
    process.env.META_APP_SECRET!,
  );
  const tokenEncryption = new AesTokenEncryption(process.env.ENCRYPTION_KEY!);
  const cacheService = new InMemoryCacheService();

  const syncCampaignsUseCase = new SyncMetaCampaignsUseCase(
    adAccountRepo,
    campaignRepo,
    metaApiClient,
    tokenEncryption,
  );
  const syncInsightsUseCase = new SyncMetaInsightsUseCase(
    campaignRepo,
    adAccountRepo,
    insightRepo,
    metaApiClient,
    tokenEncryption,
    cacheService,
  );

  return new MetaSyncService(
    syncCampaignsUseCase,
    syncInsightsUseCase,
    adAccountRepo,
    campaignRepo,
  );
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json() as { adAccountId?: string };

    if (!body.adAccountId) {
      return NextResponse.json(
        { error: 'Missing required field: adAccountId' },
        { status: 400 },
      );
    }

    const service = getService();
    const result = await service.syncCampaigns(body.adAccountId);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
