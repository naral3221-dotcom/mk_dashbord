'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

function TikTokCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const refreshToken = searchParams.get('refresh_token');
  const error = searchParams.get('error');

  const [accounts, setAccounts] = useState<
    Array<{
      advertiser_id: string;
      name: string;
      currency: string;
      timezone: string;
      is_active: boolean;
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [connected, setConnected] = useState<Set<string>>(new Set());
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (error) {
      setFetchError(error);
      setLoading(false);
      return;
    }

    if (!token) {
      setFetchError('No token provided');
      setLoading(false);
      return;
    }

    fetchAdvertisers(token);
  }, [token, error]);

  const fetchAdvertisers = async (accessToken: string) => {
    try {
      const response = await fetch(
        `/api/tiktok/accounts?access_token=${encodeURIComponent(accessToken)}`,
      );
      const data = (await response.json()) as {
        data?: Array<{
          advertiser_id: string;
          name: string;
          currency: string;
          timezone: string;
          is_active: boolean;
        }>;
        error?: string;
      };

      if (!response.ok || data.error) {
        setFetchError(data.error || 'Failed to fetch TikTok advertisers');
        return;
      }

      setAccounts(data.data || []);
    } catch {
      setFetchError('Failed to fetch TikTok advertisers');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (account: {
    advertiser_id: string;
    name: string;
  }) => {
    if (!token) return;
    setConnecting(account.advertiser_id);

    try {
      const response = await fetch('/api/tiktok/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: token,
          refreshToken: refreshToken || null,
          advertiserId: account.advertiser_id,
          advertiserName: account.name,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        setFetchError(data.error || 'Failed to connect account');
        return;
      }

      setConnected((prev) => new Set(prev).add(account.advertiser_id));
    } catch {
      setFetchError('Failed to connect account');
    } finally {
      setConnecting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-900" />
        <p className="text-sm text-gray-500">
          Loading your TikTok ad accounts...
        </p>
      </div>
    );
  }

  if (fetchError && accounts.length === 0) {
    return (
      <div className="py-12 text-center">
        <XCircle className="mx-auto h-12 w-12 text-red-400" />
        <h2 className="mt-4 text-lg font-semibold">Connection Failed</h2>
        <p className="mt-2 text-sm text-gray-500">{fetchError}</p>
        <button
          onClick={() => router.push('/integrations')}
          className="mt-4 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Back to Integrations
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-2 text-lg font-semibold">
        Select TikTok Ad Accounts to Connect
      </h2>
      <p className="mb-6 text-sm text-gray-500">
        Choose which TikTok ad accounts you want to sync with your dashboard.
      </p>

      {fetchError && <p className="mb-4 text-sm text-red-600">{fetchError}</p>}

      <div className="space-y-3">
        {accounts.map((account) => (
          <div
            key={account.advertiser_id}
            className="flex items-center justify-between rounded-lg border bg-white p-4"
          >
            <div>
              <p className="text-sm font-medium">{account.name}</p>
              <p className="text-xs text-gray-500">
                ID: {account.advertiser_id} | {account.currency} |{' '}
                {account.timezone}
              </p>
            </div>
            {connected.has(account.advertiser_id) ? (
              <span className="inline-flex items-center gap-1 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                Connected
              </span>
            ) : (
              <button
                onClick={() => handleConnect(account)}
                disabled={connecting === account.advertiser_id}
                className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {connecting === account.advertiser_id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  'Connect'
                )}
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6">
        <button
          onClick={() => router.push('/integrations')}
          className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Done
        </button>
      </div>
    </div>
  );
}

export default function TikTokCallbackPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Connect TikTok Ads</h1>
      <div className="rounded-lg border bg-white p-6">
        <Suspense
          fallback={
            <div className="flex items-center gap-2 py-8 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </div>
          }
        >
          <TikTokCallbackContent />
        </Suspense>
      </div>
    </div>
  );
}
