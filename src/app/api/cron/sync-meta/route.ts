import { NextRequest, NextResponse } from 'next/server';

function getService() {
  const { PrismaClient } = require('@/generated/prisma');
  const { PrismaAdAccountRepository } = require('@/infrastructure/repositories/PrismaAdAccountRepository');
  const { PrismaCampaignRepository } = require('@/infrastructure/repositories/PrismaCampaignRepository');
  const { PrismaCampaignInsightRepository } = require('@/infrastructure/repositories/PrismaCampaignInsightRepository');
  const { PrismaOrganizationRepository } = require('@/infrastructure/repositories/PrismaOrganizationRepository');
  const { MetaApiClient } = require('@/infrastructure/external/meta/MetaApiClient');
  const { AesTokenEncryption } = require('@/infrastructure/encryption/AesTokenEncryption');
  const { InMemoryCacheService } = require('@/infrastructure/cache/InMemoryCacheService');
  const { SyncMetaCampaignsUseCase } = require('@/domain/usecases/SyncMetaCampaignsUseCase');
  const { SyncMetaInsightsUseCase } = require('@/domain/usecases/SyncMetaInsightsUseCase');
  const { MetaSyncService } = require('@/application/services/MetaSyncService');

  const prisma = new PrismaClient();
  const adAccountRepo = new PrismaAdAccountRepository(prisma);
  const campaignRepo = new PrismaCampaignRepository(prisma);
  const insightRepo = new PrismaCampaignInsightRepository(prisma);
  const orgRepo = new PrismaOrganizationRepository(prisma);
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

  const syncService = new MetaSyncService(
    syncCampaignsUseCase,
    syncInsightsUseCase,
    adAccountRepo,
    campaignRepo,
  );

  return { syncService, orgRepo };
}

export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { syncService, orgRepo } = getService();

    // Get all organizations and sync their META accounts
    const { organizations } = await orgRepo.findAll({ take: 1000 });

    const allResults = [];
    for (const org of organizations) {
      try {
        const result = await syncService.syncAllActiveAccounts(org.id);
        if (result.totalAccounts > 0) {
          allResults.push({
            organizationId: org.id,
            organizationName: org.name,
            ...result,
          });
        }
      } catch (err) {
        allResults.push({
          organizationId: org.id,
          organizationName: org.name,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results: allResults,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
