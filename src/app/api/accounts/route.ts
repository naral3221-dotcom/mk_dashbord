import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/apiErrorHandler';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform');
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
    }

    // Lazy import to avoid build issues
    const { getPrisma } = await import('@/infrastructure/database/prisma');
    const prisma = getPrisma();

    const where: Record<string, unknown> = { organizationId };
    if (platform) {
      where.platform = platform;
    }

    const accounts = await prisma.adAccount.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      accounts: accounts.map((a: {
        id: string;
        platform: string;
        accountId: string;
        accountName: string;
        isActive: boolean;
        tokenExpiresAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
      }) => ({
        id: a.id,
        platform: a.platform,
        accountId: a.accountId,
        accountName: a.accountName,
        isActive: a.isActive,
        tokenExpiresAt: a.tokenExpiresAt?.toISOString() ?? null,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      })),
      total: accounts.length,
    });
  } catch (error) {
    const { body, status } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
