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
    return NextResponse.redirect(new URL('/integrations?error=no_code', request.url));
  }

  try {
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/meta/auth/callback`;

    if (!appId || !appSecret) {
      return NextResponse.redirect(new URL('/integrations?error=config', request.url));
    }

    // Exchange code for short-lived token
    const tokenUrl = `https://graph.facebook.com/v21.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`;

    const tokenResponse = await fetch(tokenUrl);
    const tokenData = await tokenResponse.json() as {
      access_token?: string;
      error?: { message: string };
    };

    if (!tokenData.access_token) {
      const errorMsg = tokenData.error?.message || 'token_exchange_failed';
      return NextResponse.redirect(
        new URL(`/integrations?error=${encodeURIComponent(errorMsg)}`, request.url),
      );
    }

    // Redirect to callback page with short-lived token for account selection
    const callbackUrl = new URL('/integrations/meta/callback', request.url);
    callbackUrl.searchParams.set('token', tokenData.access_token);
    return NextResponse.redirect(callbackUrl);
  } catch {
    return NextResponse.redirect(new URL('/integrations?error=callback_failed', request.url));
  }
}
