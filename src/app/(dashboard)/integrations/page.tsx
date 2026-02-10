export const dynamic = 'force-dynamic';

import { MetaConnectButton } from '@/components/integrations/MetaConnectButton';
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
            <AdAccountList organizationId={organizationId} />
          </div>
        </div>

        {/* Placeholder for future platforms */}
        <div className="rounded-lg border bg-white p-6 opacity-50">
          <h2 className="text-lg font-semibold">Google Ads</h2>
          <p className="text-sm text-gray-500">Coming soon</p>
        </div>

        <div className="rounded-lg border bg-white p-6 opacity-50">
          <h2 className="text-lg font-semibold">TikTok Ads</h2>
          <p className="text-sm text-gray-500">Coming soon</p>
        </div>
      </div>
    </div>
  );
}
