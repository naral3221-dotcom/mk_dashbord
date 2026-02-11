'use client';

import { useRouter } from 'next/navigation';
import { useSubscription } from '@/hooks/useSubscription';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { CurrentPlanBadge } from '@/components/billing/CurrentPlanBadge';
import { UsageMeter } from '@/components/billing/UsageMeter';
import { UpgradePrompt } from '@/components/billing/UpgradePrompt';
import { PricingTable } from '@/components/billing/PricingTable';
import { Plan } from '@/domain/entities/types';

export default function BillingPage() {
  const router = useRouter();
  const { subscription, loading: subLoading, error: subError } = useSubscription();
  const { usage, loading: usageLoading, error: usageError } = usePlanLimits();

  const currentPlan = subscription?.plan ?? Plan.FREE;
  const isFreePlan = currentPlan === Plan.FREE;

  const handleUpgrade = async (plan: Plan) => {
    if (plan === Plan.FREE) return;

    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          successUrl: `${window.location.origin}/settings/billing?success=true`,
          cancelUrl: `${window.location.origin}/settings/billing`,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create checkout session');
      }

      const { url } = await res.json();
      if (url) {
        window.location.href = url;
      }
    } catch {
      // Sentry captures unhandled errors via client config
    }
  };

  const handleManageSubscription = async () => {
    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnUrl: `${window.location.origin}/settings/billing`,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create portal session');
      }

      const { url } = await res.json();
      if (url) {
        window.location.href = url;
      }
    } catch {
      // Sentry captures unhandled errors via client config
    }
  };

  if (subLoading || usageLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Billing</h1>
        <div className="animate-pulse space-y-4">
          <div className="h-32 rounded-lg bg-gray-200" />
          <div className="h-48 rounded-lg bg-gray-200" />
        </div>
      </div>
    );
  }

  if (subError || usageError) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Billing</h1>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          {subError || usageError}
        </div>
      </div>
    );
  }

  const adAccountFeature = usage?.features.find((f) => f.feature === 'maxAdAccounts');
  const userFeature = usage?.features.find((f) => f.feature === 'maxUsers');
  const hasLimitReached = usage?.features.some((f) => !f.allowed) ?? false;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Billing</h1>
        {!isFreePlan && (
          <button
            onClick={handleManageSubscription}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
          >
            Manage Subscription
          </button>
        )}
      </div>

      {/* Current Plan */}
      <div className="rounded-lg border bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Current Plan</h2>
            <div className="mt-2">
              <CurrentPlanBadge plan={currentPlan} />
            </div>
            {subscription?.subscription && (
              <p className="mt-2 text-sm text-gray-500">
                {subscription.subscription.cancelAtPeriodEnd
                  ? `Cancels on ${new Date(subscription.subscription.currentPeriodEnd).toLocaleDateString()}`
                  : `Renews on ${new Date(subscription.subscription.currentPeriodEnd).toLocaleDateString()}`}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Usage */}
      <div className="rounded-lg border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Usage</h2>
        <div className="space-y-4">
          {adAccountFeature && (
            <UsageMeter
              label="Ad Accounts"
              current={adAccountFeature.currentUsage ?? 0}
              limit={adAccountFeature.limit ?? -1}
            />
          )}
          {userFeature && (
            <UsageMeter
              label="Team Members"
              current={userFeature.currentUsage ?? 0}
              limit={userFeature.limit ?? -1}
            />
          )}
        </div>
      </div>

      {/* Upgrade prompt */}
      {hasLimitReached && (
        <UpgradePrompt
          message="You've reached some limits on your current plan. Upgrade to unlock more features."
          onUpgrade={() => router.push('#plans')}
        />
      )}

      {/* Pricing */}
      {isFreePlan && (
        <div id="plans">
          <h2 className="mb-4 text-lg font-semibold">Upgrade Your Plan</h2>
          <PricingTable currentPlan={currentPlan} onSelectPlan={handleUpgrade} />
        </div>
      )}
    </div>
  );
}
