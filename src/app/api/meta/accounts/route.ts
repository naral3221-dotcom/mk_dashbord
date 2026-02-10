import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/infrastructure/database/prisma';
import { PrismaAdAccountRepository } from '@/infrastructure/repositories/PrismaAdAccountRepository';
import { PrismaUserRepository } from '@/infrastructure/repositories/PrismaUserRepository';
import { MetaApiClient } from '@/infrastructure/external/meta/MetaApiClient';
import { AesTokenEncryption } from '@/infrastructure/encryption/AesTokenEncryption';
import { ConnectMetaAdAccountUseCase } from '@/domain/usecases/ConnectMetaAdAccountUseCase';
import { MetaAdAccountService } from '@/application/services/MetaAdAccountService';
import { requireAuth } from '@/lib/auth';

function getService() {
  const prisma = getPrisma();
  const adAccountRepo = new PrismaAdAccountRepository(prisma);
  const userRepo = new PrismaUserRepository(prisma);
  const metaApiClient = new MetaApiClient(
    process.env.META_APP_ID!,
    process.env.META_APP_SECRET!,
  );
  const tokenEncryption = new AesTokenEncryption(process.env.ENCRYPTION_KEY!);
  const connectUseCase = new ConnectMetaAdAccountUseCase(
    adAccountRepo,
    userRepo,
    metaApiClient,
    tokenEncryption,
  );
  return new MetaAdAccountService(connectUseCase, adAccountRepo);
}

export async function GET() {
  try {
    const user = await requireAuth();
    if (!user.organizationId) {
      return NextResponse.json({ error: 'No organization' }, { status: 400 });
    }

    const service = getService();
    const result = await service.getAdAccounts(user.organizationId);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
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

    const body = await request.json() as {
      shortLivedToken?: string;
      metaAccountId?: string;
      metaAccountName?: string;
    };

    if (!body.shortLivedToken || !body.metaAccountId || !body.metaAccountName) {
      return NextResponse.json(
        { error: 'Missing required fields: shortLivedToken, metaAccountId, metaAccountName' },
        { status: 400 },
      );
    }

    const service = getService();
    const result = await service.connectAdAccount({
      userId: user.userId,
      organizationId: user.organizationId,
      shortLivedToken: body.shortLivedToken,
      metaAccountId: body.metaAccountId,
      metaAccountName: body.metaAccountName,
    });

    return NextResponse.json(result, { status: result.isNew ? 201 : 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status =
      message === 'Unauthorized' ? 401 :
      message.includes('permission') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
