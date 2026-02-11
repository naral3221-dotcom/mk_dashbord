import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/infrastructure/database/prisma';
import { PrismaAdAccountRepository } from '@/infrastructure/repositories/PrismaAdAccountRepository';
import { PrismaUserRepository } from '@/infrastructure/repositories/PrismaUserRepository';
import { PrismaOrganizationRepository } from '@/infrastructure/repositories/PrismaOrganizationRepository';
import { NaverAdsApiClient } from '@/infrastructure/external/naver/NaverAdsApiClient';
import { NaverAdsPlatformAdapter } from '@/infrastructure/external/naver/NaverAdsPlatformAdapter';
import { AesTokenEncryption } from '@/infrastructure/encryption/AesTokenEncryption';
import { PlatformAdapterRegistry } from '@/infrastructure/external/PlatformAdapterRegistry';
import { ConnectAdAccountUseCase } from '@/domain/usecases/ConnectAdAccountUseCase';
import { Platform } from '@/domain/entities/types';
import { requireAuth } from '@/lib/auth';
import { handleApiError } from '@/lib/apiErrorHandler';

function getUseCase() {
  const prisma = getPrisma();
  const adAccountRepo = new PrismaAdAccountRepository(prisma);
  const userRepo = new PrismaUserRepository(prisma);
  const orgRepo = new PrismaOrganizationRepository(prisma);
  const naverApiClient = new NaverAdsApiClient();
  const naverAdapter = new NaverAdsPlatformAdapter(naverApiClient);
  const registry = new PlatformAdapterRegistry();
  registry.register(naverAdapter);
  const tokenEncryption = new AesTokenEncryption(process.env.ENCRYPTION_KEY!);
  return { useCase: new ConnectAdAccountUseCase(adAccountRepo, userRepo, registry, tokenEncryption, orgRepo), adAccountRepo };
}

export async function GET() {
  try {
    const user = await requireAuth();
    if (!user.organizationId) {
      return NextResponse.json({ error: 'No organization' }, { status: 400 });
    }

    const { adAccountRepo } = getUseCase();
    const accounts = await adAccountRepo.findByPlatform(user.organizationId, Platform.NAVER);
    return NextResponse.json(
      accounts.map((a) => ({
        id: a.id,
        accountId: a.accountId,
        accountName: a.accountName,
        platform: a.platform,
        isActive: a.isActive,
        createdAt: a.createdAt,
      })),
    );
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
      apiKey?: string;
      apiSecret?: string;
      customerId?: string;
    };

    if (!body.apiKey || !body.apiSecret || !body.customerId) {
      return NextResponse.json(
        { error: 'Missing required fields: apiKey, apiSecret, customerId' },
        { status: 400 },
      );
    }

    // Validate credentials before storing
    const naverApiClient = new NaverAdsApiClient();
    const isValid = await naverApiClient.validateCredentials(
      body.apiKey,
      body.apiSecret,
      body.customerId,
    );

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid Naver API credentials' },
        { status: 401 },
      );
    }

    // Get customer info for account name
    const customerInfo = await naverApiClient.getCustomerInfo(
      body.apiKey,
      body.apiSecret,
      body.customerId,
    );

    const { useCase } = getUseCase();
    const result = await useCase.execute({
      userId: user.userId,
      organizationId: user.organizationId,
      platform: Platform.NAVER,
      externalAccountId: body.customerId,
      externalAccountName: customerInfo.name,
      apiKey: body.apiKey,
      apiSecret: body.apiSecret,
      customerId: body.customerId,
    });

    return NextResponse.json(
      {
        id: result.adAccount.id,
        accountId: result.adAccount.accountId,
        accountName: result.adAccount.accountName,
        platform: result.adAccount.platform,
        isActive: result.adAccount.isActive,
        isNewAccount: result.isNewAccount,
      },
      { status: result.isNewAccount ? 201 : 200 },
    );
  } catch (error) {
    const { body, status } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
