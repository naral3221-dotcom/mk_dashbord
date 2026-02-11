import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/infrastructure/auth/nextauth.config';
import { handleApiError } from '@/lib/apiErrorHandler';

function getService() {
  const getPrisma = require('@/infrastructure/database/prisma').default;
  const { PrismaAdAccountRepository } = require('@/infrastructure/repositories/PrismaAdAccountRepository') as {
    PrismaAdAccountRepository: new (prisma: unknown) => unknown;
  };
  const { PrismaCampaignRepository } = require('@/infrastructure/repositories/PrismaCampaignRepository') as {
    PrismaCampaignRepository: new (prisma: unknown) => unknown;
  };
  const { TikTokAdsApiClient } = require('@/infrastructure/external/tiktok/TikTokAdsApiClient') as {
    TikTokAdsApiClient: new (appId: string, appSecret: string) => unknown;
  };
  const { TikTokAdsPlatformAdapter } = require('@/infrastructure/external/tiktok/TikTokAdsPlatformAdapter') as {
    TikTokAdsPlatformAdapter: new (client: unknown, appId: string) => {
      getCampaigns: (token: string, accountId: string) => Promise<Array<{
        externalCampaignId: string;
        name: string;
        status: string;
      }>>;
    };
  };
  const { AesTokenEncryption } = require('@/infrastructure/encryption/AesTokenEncryption') as {
    AesTokenEncryption: new (key: string) => { decrypt: (encrypted: string) => string };
  };

  const prisma = getPrisma();
  const adAccountRepo = new PrismaAdAccountRepository(prisma);
  const campaignRepo = new PrismaCampaignRepository(prisma);
  const tikTokApiClient = new TikTokAdsApiClient(
    process.env.TIKTOK_APP_ID!,
    process.env.TIKTOK_APP_SECRET!,
  );
  const adapter = new TikTokAdsPlatformAdapter(
    tikTokApiClient,
    process.env.TIKTOK_APP_ID!,
  );
  const tokenEncryption = new AesTokenEncryption(process.env.ENCRYPTION_KEY!);

  return { adAccountRepo, campaignRepo, adapter, tokenEncryption };
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as { adAccountId?: string };

    if (!body.adAccountId) {
      return NextResponse.json(
        { error: 'Missing required field: adAccountId' },
        { status: 400 },
      );
    }

    const { adapter } = getService();

    // For now, return a placeholder response. Full sync logic will be implemented
    // when TikTok-specific sync use cases are created.
    return NextResponse.json({
      message: 'TikTok campaign sync initiated',
      adAccountId: body.adAccountId,
    });
  } catch (error) {
    const { body, status } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
