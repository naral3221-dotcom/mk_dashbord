import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/infrastructure/auth/nextauth.config';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }

  const authCode = request.nextUrl.searchParams.get('auth_code');
  const error = request.nextUrl.searchParams.get('error');

  if (error) {
    const redirectUrl = new URL('/integrations', request.url);
    redirectUrl.searchParams.set('error', error);
    return NextResponse.redirect(redirectUrl);
  }

  if (!authCode) {
    return NextResponse.redirect(
      new URL('/integrations?error=no_auth_code', request.url),
    );
  }

  try {
    const appId = process.env.TIKTOK_APP_ID;
    const appSecret = process.env.TIKTOK_APP_SECRET;

    if (!appId || !appSecret) {
      return NextResponse.redirect(
        new URL('/integrations?error=tiktok_not_configured', request.url),
      );
    }

    // Exchange auth_code for access token using TikTok API
    const { TikTokAdsApiClient } = await import(
      '@/infrastructure/external/tiktok/TikTokAdsApiClient'
    );
    const client = new TikTokAdsApiClient(appId, appSecret);
    const tokenResult = await client.exchangeCode(authCode);

    // Redirect to callback page with access token for account selection
    const callbackUrl = new URL('/integrations/tiktok/callback', request.url);
    callbackUrl.searchParams.set('token', tokenResult.accessToken);
    callbackUrl.searchParams.set('refresh_token', tokenResult.refreshToken);
    return NextResponse.redirect(callbackUrl);
  } catch {
    return NextResponse.redirect(
      new URL('/integrations?error=tiktok_callback_failed', request.url),
    );
  }
}
