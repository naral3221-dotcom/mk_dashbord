import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

function getService() {
  const { getPrisma } = require('@/infrastructure/database/prisma') as {
    getPrisma: () => unknown;
  };
  const { PrismaAdAccountRepository } = require('@/infrastructure/repositories/PrismaAdAccountRepository') as {
    PrismaAdAccountRepository: new (prisma: unknown) => unknown;
  };
  const { TikTokAdsApiClient } = require('@/infrastructure/external/tiktok/TikTokAdsApiClient') as {
    TikTokAdsApiClient: new (appId: string, appSecret: string) => {
      getAdvertisers: (token: string) => Promise<Array<{
        advertiserId: string;
        name: string;
        currency: string;
        timezone: string;
        status: string;
      }>>;
    };
  };

  const prisma = getPrisma();
  const adAccountRepo = new PrismaAdAccountRepository(prisma);
  const tikTokApiClient = new TikTokAdsApiClient(
    process.env.TIKTOK_APP_ID!,
    process.env.TIKTOK_APP_SECRET!,
  );

  return { adAccountRepo, tikTokApiClient };
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user.organizationId) {
      return NextResponse.json({ error: 'No organization' }, { status: 400 });
    }

    const accessToken = request.nextUrl.searchParams.get('access_token');
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Missing access_token parameter' },
        { status: 400 },
      );
    }

    const { tikTokApiClient } = getService();
    const advertisers = await tikTokApiClient.getAdvertisers(accessToken);

    return NextResponse.json({
      data: advertisers.map((adv) => ({
        advertiser_id: adv.advertiserId,
        name: adv.name,
        currency: adv.currency,
        timezone: adv.timezone,
        is_active: adv.status === 'STATUS_ENABLE',
      })),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    const status = message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user.organizationId) {
      return NextResponse.json({ error: 'No organization' }, { status: 400 });
    }

    const body = (await request.json()) as {
      accessToken?: string;
      refreshToken?: string;
      advertiserId?: string;
      advertiserName?: string;
    };

    if (
      !body.accessToken ||
      !body.advertiserId ||
      !body.advertiserName
    ) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: accessToken, advertiserId, advertiserName',
        },
        { status: 400 },
      );
    }

    // For now, return success acknowledging the connection request.
    // Full persistence will be handled when TikTok-specific use cases are implemented.
    return NextResponse.json(
      {
        message: 'TikTok account connection initiated',
        advertiserId: body.advertiserId,
        advertiserName: body.advertiserName,
      },
      { status: 201 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    const status =
      message === 'Unauthorized'
        ? 401
        : message.includes('permission')
          ? 403
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
