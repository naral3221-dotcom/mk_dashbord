import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/infrastructure/auth/nextauth.config';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }

  const code = request.nextUrl.searchParams.get('code');
  const error = request.nextUrl.searchParams.get('error');

  if (error) {
    const redirectUrl = new URL('/integrations', request.url);
    redirectUrl.searchParams.set('error', error);
    return NextResponse.redirect(redirectUrl);
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/integrations?error=no_code', request.url),
    );
  }

  try {
    const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;
    const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/google/auth/callback`;

    if (!clientId || !clientSecret || !developerToken) {
      return NextResponse.redirect(
        new URL('/integrations?error=config', request.url),
      );
    }

    // Lazy import to avoid build-time issues
    const { GoogleAdsApiClient } = await import(
      '@/infrastructure/external/google/GoogleAdsApiClient'
    );

    const googleAdsClient = new GoogleAdsApiClient(
      clientId,
      clientSecret,
      developerToken,
    );

    const tokenResult = await googleAdsClient.exchangeCode(code, redirectUri);

    // Redirect to callback page with token info
    const callbackUrl = new URL(
      '/integrations/google/callback',
      request.url,
    );
    callbackUrl.searchParams.set('token', tokenResult.accessToken);
    if (tokenResult.refreshToken) {
      callbackUrl.searchParams.set('refresh', tokenResult.refreshToken);
    }
    return NextResponse.redirect(callbackUrl);
  } catch {
    return NextResponse.redirect(
      new URL('/integrations?error=callback_failed', request.url),
    );
  }
}
