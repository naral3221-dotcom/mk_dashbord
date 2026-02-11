import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/infrastructure/auth/nextauth.config';
import { handleApiError } from '@/lib/apiErrorHandler';

function getGoogleAdsClient() {
  const { GoogleAdsApiClient } = require(
    '@/infrastructure/external/google/GoogleAdsApiClient',
  ) as typeof import('@/infrastructure/external/google/GoogleAdsApiClient');
  const { GoogleAdsPlatformAdapter } = require(
    '@/infrastructure/external/google/GoogleAdsPlatformAdapter',
  ) as typeof import('@/infrastructure/external/google/GoogleAdsPlatformAdapter');

  const clientId = process.env.GOOGLE_ADS_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET!;
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN!;

  const apiClient = new GoogleAdsApiClient(
    clientId,
    clientSecret,
    developerToken,
  );
  return new GoogleAdsPlatformAdapter(apiClient, clientId);
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

    // Lazy imports to avoid build-time issues
    const getPrisma = require('@/infrastructure/database/prisma').default;
    const { AesTokenEncryption } = require(
      '@/infrastructure/encryption/AesTokenEncryption',
    ) as typeof import('@/infrastructure/encryption/AesTokenEncryption');

    const prisma = getPrisma();
    const tokenEncryption = new AesTokenEncryption(
      process.env.ENCRYPTION_KEY!,
    );

    // Fetch the ad account
    const adAccount = await prisma.adAccount.findUnique({
      where: { id: body.adAccountId },
    });

    if (!adAccount) {
      return NextResponse.json(
        { error: 'Ad account not found' },
        { status: 404 },
      );
    }

    if (adAccount.platform !== 'GOOGLE') {
      return NextResponse.json(
        { error: 'Ad account is not a Google Ads account' },
        { status: 400 },
      );
    }

    if (!adAccount.accessToken) {
      return NextResponse.json(
        { error: 'Ad account has no access token' },
        { status: 400 },
      );
    }

    // Decrypt the access token
    const accessToken = await tokenEncryption.decrypt(adAccount.accessToken);

    // Fetch campaigns from Google Ads
    const adapter = getGoogleAdsClient();
    const campaigns = await adapter.getCampaigns(
      accessToken,
      adAccount.accountId,
    );

    // Upsert campaigns
    let created = 0;
    let updated = 0;

    for (const campaign of campaigns) {
      const existing = await prisma.campaign.findFirst({
        where: {
          adAccountId: adAccount.id,
          externalId: campaign.externalCampaignId,
        },
      });

      if (existing) {
        await prisma.campaign.update({
          where: { id: existing.id },
          data: {
            name: campaign.name,
            status: campaign.status,
          },
        });
        updated++;
      } else {
        await prisma.campaign.create({
          data: {
            adAccountId: adAccount.id,
            externalId: campaign.externalCampaignId,
            name: campaign.name,
            status: campaign.status,
          },
        });
        created++;
      }
    }

    return NextResponse.json({
      success: true,
      synced: campaigns.length,
      created,
      updated,
    });
  } catch (error) {
    const { body, status } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
