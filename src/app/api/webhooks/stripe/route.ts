import { NextRequest, NextResponse } from 'next/server';
import { getBillingService } from '../../billing/_shared/getBillingService';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 },
      );
    }

    const service = getBillingService();
    const result = await service.handleWebhook(payload, signature);
    return NextResponse.json({ received: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Webhook processing failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
