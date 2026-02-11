import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
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

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user.organizationId) {
      return NextResponse.json({ error: 'No organization' }, { status: 400 });
    }

    const accessToken = request.nextUrl.searchParams.get('token');
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Missing access token' },
        { status: 400 },
      );
    }

    const adapter = getGoogleAdsClient();
    const accounts = await adapter.getAdAccounts(accessToken);
    return NextResponse.json({ accounts });
  } catch (error) {
    const { body, status } = handleApiError(error);
    return NextResponse.json(body, { status });
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
      googleAccountId?: string;
      googleAccountName?: string;
    };

    if (
      !body.accessToken ||
      !body.googleAccountId ||
      !body.googleAccountName
    ) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: accessToken, googleAccountId, googleAccountName',
        },
        { status: 400 },
      );
    }

    // Store the ad account connection
    const { getPrisma } = require(
      '@/infrastructure/database/prisma',
    ) as typeof import('@/infrastructure/database/prisma');
    const { AesTokenEncryption } = require(
      '@/infrastructure/encryption/AesTokenEncryption',
    ) as typeof import('@/infrastructure/encryption/AesTokenEncryption');

    const prisma = getPrisma();
    const tokenEncryption = new AesTokenEncryption(
      process.env.ENCRYPTION_KEY!,
    );

    const encryptedToken = await tokenEncryption.encrypt(body.accessToken);
    const encryptedRefreshToken = body.refreshToken
      ? await tokenEncryption.encrypt(body.refreshToken)
      : null;

    // Check if account already connected
    const existing = await prisma.adAccount.findFirst({
      where: {
        organizationId: user.organizationId,
        platform: 'GOOGLE',
        accountId: body.googleAccountId,
      },
    });

    if (existing) {
      // Update existing connection
      const updated = await prisma.adAccount.update({
        where: { id: existing.id },
        data: {
          accessToken: encryptedToken,
          refreshToken: encryptedRefreshToken,
          isActive: true,
        },
      });
      return NextResponse.json({ account: updated, isNew: false });
    }

    // Create new connection
    const adAccount = await prisma.adAccount.create({
      data: {
        organizationId: user.organizationId,
        platform: 'GOOGLE',
        accountId: body.googleAccountId,
        accountName: body.googleAccountName,
        accessToken: encryptedToken,
        refreshToken: encryptedRefreshToken,
        isActive: true,
      },
    });

    return NextResponse.json({ account: adAccount, isNew: true }, { status: 201 });
  } catch (error) {
    const { body, status } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
