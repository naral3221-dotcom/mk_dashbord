import { NextResponse } from 'next/server';
import { auth } from '@/infrastructure/auth/nextauth.config';

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const appId = process.env.TIKTOK_APP_ID;
  if (!appId) {
    return NextResponse.json(
      { error: 'TikTok Ads not configured' },
      { status: 500 },
    );
  }

  const redirectUri = `${process.env.NEXTAUTH_URL}/api/tiktok/auth/callback`;
  const state = crypto.randomUUID();

  const url = `https://business-api.tiktok.com/portal/auth?app_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

  return NextResponse.json({ url, state });
}
