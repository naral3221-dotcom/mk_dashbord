import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/infrastructure/auth/nextauth.config';
import { getPrisma } from '@/infrastructure/database/prisma';
import { PrismaAdAccountRepository } from '@/infrastructure/repositories/PrismaAdAccountRepository';
import { PrismaCampaignRepository } from '@/infrastructure/repositories/PrismaCampaignRepository';
import { NaverAdsApiClient } from '@/infrastructure/external/naver/NaverAdsApiClient';
import { NaverAdsPlatformAdapter } from '@/infrastructure/external/naver/NaverAdsPlatformAdapter';
import { AesTokenEncryption } from '@/infrastructure/encryption/AesTokenEncryption';
import { Platform } from '@/domain/entities/types';
import { handleApiError } from '@/lib/apiErrorHandler';

function getServices() {
  const prisma = getPrisma();
  const adAccountRepo = new PrismaAdAccountRepository(prisma);
  const campaignRepo = new PrismaCampaignRepository(prisma);
  const naverApiClient = new NaverAdsApiClient();
  const naverAdapter = new NaverAdsPlatformAdapter(naverApiClient);
  const tokenEncryption = new AesTokenEncryption(process.env.ENCRYPTION_KEY!);

  return { adAccountRepo, campaignRepo, naverAdapter, tokenEncryption };
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

    const { adAccountRepo, campaignRepo, naverAdapter, tokenEncryption } = getServices();

    const adAccount = await adAccountRepo.findById(body.adAccountId);
    if (!adAccount) {
      return NextResponse.json({ error: 'Ad account not found' }, { status: 404 });
    }

    if (adAccount.platform !== Platform.NAVER) {
      return NextResponse.json(
        { error: 'Ad account is not a Naver account' },
        { status: 400 },
      );
    }

    if (!adAccount.accessToken) {
      return NextResponse.json(
        { error: 'Ad account has no access token' },
        { status: 400 },
      );
    }

    // Decrypt the stored credentials
    const decryptedToken = await tokenEncryption.decrypt(adAccount.accessToken);

    // Get campaigns from Naver
    const normalizedCampaigns = await naverAdapter.getCampaigns(
      decryptedToken,
      adAccount.accountId,
    );

    // Sync campaigns to database
    let synced = 0;
    for (const campaignData of normalizedCampaigns) {
      const existing = await campaignRepo.findByExternalId(
        adAccount.id,
        campaignData.externalCampaignId,
      );

      if (existing) {
        const updated = existing.changeStatus(campaignData.status);
        await campaignRepo.save(updated);
      } else {
        const { Campaign } = await import('@/domain/entities/Campaign');
        const newCampaign = Campaign.create({
          adAccountId: adAccount.id,
          externalId: campaignData.externalCampaignId,
          name: campaignData.name,
          status: campaignData.status,
        });
        await campaignRepo.save(newCampaign);
      }
      synced++;
    }

    return NextResponse.json({
      synced,
      total: normalizedCampaigns.length,
      adAccountId: body.adAccountId,
    });
  } catch (error) {
    const { body, status } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
