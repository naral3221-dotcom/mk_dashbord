export const dynamic = 'force-dynamic';

import { MetaConnectButton } from '@/components/integrations/MetaConnectButton';
import { GoogleConnectButton } from '@/components/integrations/GoogleConnectButton';
import { TikTokConnectButton } from '@/components/integrations/TikTokConnectButton';
import { NaverConnectForm } from '@/components/integrations/NaverConnectForm';
import { AdAccountList } from '@/components/integrations/AdAccountList';
import { auth } from '@/infrastructure/auth/nextauth.config';
import { redirect } from 'next/navigation';

export default async function IntegrationsPage() {
  const session = await auth();
  if (!session?.user) {
    redirect('/sign-in');
  }

  const organizationId = (session.user as any).organizationId as string | undefined;

  if (!organizationId) {
    redirect('/onboarding');
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Integrations</h1>
      </div>

      <div className="space-y-6">
        {/* META Integration Card */}
        <div className="rounded-lg border bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">META (Facebook / Instagram)</h2>
              <p className="text-sm text-gray-500">
                Connect your META ad accounts to sync campaigns and insights.
              </p>
            </div>
            <MetaConnectButton />
          </div>

          <div className="border-t pt-4">
            <h3 className="mb-3 text-sm font-medium text-gray-700">Connected Accounts</h3>
            <AdAccountList organizationId={organizationId} platform="META" />
          </div>
        </div>

        {/* Google Ads Integration Card */}
        <div className="rounded-lg border bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Google Ads</h2>
              <p className="text-sm text-gray-500">
                Connect your Google Ads accounts to sync campaigns and insights.
              </p>
            </div>
            <GoogleConnectButton />
          </div>

          <div className="border-t pt-4">
            <h3 className="mb-3 text-sm font-medium text-gray-700">Connected Accounts</h3>
            <AdAccountList organizationId={organizationId} platform="GOOGLE" />
          </div>
        </div>

        {/* TikTok Ads Integration Card */}
        <div className="rounded-lg border bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">TikTok Ads</h2>
              <p className="text-sm text-gray-500">
                Connect your TikTok ad accounts to sync campaigns and insights.
              </p>
            </div>
            <TikTokConnectButton />
          </div>

          <div className="border-t pt-4">
            <h3 className="mb-3 text-sm font-medium text-gray-700">Connected Accounts</h3>
            <AdAccountList organizationId={organizationId} platform="TIKTOK" />
          </div>
        </div>

        {/* Naver Search Ads Integration Card */}
        <div className="rounded-lg border bg-white p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Naver Search Ads</h2>
            <p className="text-sm text-gray-500">
              Connect your Naver Search Ads account using API credentials.
            </p>
          </div>

          <div className="mb-4 border-t pt-4">
            <NaverConnectForm />
          </div>

          <div className="border-t pt-4">
            <h3 className="mb-3 text-sm font-medium text-gray-700">Connected Accounts</h3>
            <AdAccountList organizationId={organizationId} platform="NAVER" />
          </div>
        </div>
      </div>
    </div>
  );
}
