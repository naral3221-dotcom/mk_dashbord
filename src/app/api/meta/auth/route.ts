import { NextResponse } from 'next/server';
import { auth } from '@/infrastructure/auth/nextauth.config';

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const appId = process.env.META_APP_ID;
  if (!appId) {
    return NextResponse.json({ error: 'META_APP_ID not configured' }, { status: 500 });
  }

  const redirectUri = `${process.env.NEXTAUTH_URL}/api/meta/auth/callback`;
  const scope = 'ads_read,ads_management';
  const state = (session.user as Record<string, unknown>).id as string;

  const authUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${state}&response_type=code`;

  return NextResponse.json({ authUrl });
}
