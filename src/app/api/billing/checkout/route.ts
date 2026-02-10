import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/infrastructure/auth/nextauth.config';
import { Plan } from '@/domain/entities/types';
import { getBillingService } from '../_shared/getBillingService';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const userId = (session.user as Record<string, unknown>).id as string;
    const organizationId = (session.user as Record<string, unknown>).organizationId as string | undefined;
    if (!organizationId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 });
    }

    const body = await request.json();
    const { plan, successUrl, cancelUrl } = body;

    if (!plan || !successUrl || !cancelUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: plan, successUrl, cancelUrl' },
        { status: 400 },
      );
    }

    if (!Object.values(Plan).includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const service = getBillingService();
    const result = await service.createCheckout(userId, organizationId, {
      plan,
      successUrl,
      cancelUrl,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    const status = message.includes('permission') || message.includes('owners') ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
