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
        <h1 className="text-2xl font-bold">연동 관리</h1>
      </div>

      <div className="space-y-6">
        {/* META Integration Card */}
        <div className="rounded-lg border bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">META (Facebook / Instagram)</h2>
              <p className="text-sm text-gray-500">
                META 광고 계정을 연결하여 캠페인 및 인사이트를 동기화하세요.
              </p>
            </div>
            <MetaConnectButton />
          </div>

          <div className="border-t pt-4">
            <h3 className="mb-3 text-sm font-medium text-gray-700">연결된 계정</h3>
            <AdAccountList organizationId={organizationId} platform="META" />
          </div>
        </div>

        {/* Google Ads Integration Card */}
        <div className="rounded-lg border bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Google Ads</h2>
              <p className="text-sm text-gray-500">
                Google Ads 계정을 연결하여 캠페인 및 인사이트를 동기화하세요.
              </p>
            </div>
            <GoogleConnectButton />
          </div>

          <div className="border-t pt-4">
            <h3 className="mb-3 text-sm font-medium text-gray-700">연결된 계정</h3>
            <AdAccountList organizationId={organizationId} platform="GOOGLE" />
          </div>
        </div>

        {/* TikTok Ads Integration Card */}
        <div className="rounded-lg border bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">TikTok Ads</h2>
              <p className="text-sm text-gray-500">
                TikTok Ads 계정을 연결하여 캠페인 및 인사이트를 동기화하세요.
              </p>
            </div>
            <TikTokConnectButton />
          </div>

          <div className="border-t pt-4">
            <h3 className="mb-3 text-sm font-medium text-gray-700">연결된 계정</h3>
            <AdAccountList organizationId={organizationId} platform="TIKTOK" />
          </div>
        </div>

        {/* Naver Search Ads Integration Card */}
        <div className="rounded-lg border bg-white p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Naver Ads</h2>
            <p className="text-sm text-gray-500">
              Naver Ads 계정을 API 자격 증명으로 연결하세요.
            </p>
          </div>

          <div className="mb-4 border-t pt-4">
            <NaverConnectForm />
          </div>

          <div className="border-t pt-4">
            <h3 className="mb-3 text-sm font-medium text-gray-700">연결된 계정</h3>
            <AdAccountList organizationId={organizationId} platform="NAVER" />
          </div>
        </div>
      </div>
    </div>
  );
}
