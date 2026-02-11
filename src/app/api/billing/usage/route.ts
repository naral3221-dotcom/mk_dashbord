import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/infrastructure/auth/nextauth.config';
import { getBillingService } from '../_shared/getBillingService';
import { handleApiError } from '@/lib/apiErrorHandler';

export async function GET(_request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const organizationId = (session.user as Record<string, unknown>).organizationId as string | undefined;
    if (!organizationId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 });
    }

    const service = getBillingService();
    const result = await service.getUsage(organizationId);
    return NextResponse.json(result);
  } catch (error) {
    const { body, status } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
