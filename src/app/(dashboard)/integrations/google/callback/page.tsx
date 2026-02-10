'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

function GoogleCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const refreshToken = searchParams.get('refresh');
  const error = searchParams.get('error');

  const [accounts, setAccounts] = useState<
    Array<{
      externalAccountId: string;
      name: string;
      currency: string;
      timezone: string;
      isActive: boolean;
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

    fetchAdAccounts(token);
  }, [token, error]);

  const fetchAdAccounts = async (accessToken: string) => {
    try {
      const response = await fetch(
        `/api/google/accounts?token=${encodeURIComponent(accessToken)}`,
      );
      const data = (await response.json()) as {
        accounts?: Array<{
          externalAccountId: string;
          name: string;
          currency: string;
          timezone: string;
          isActive: boolean;
        }>;
        error?: string;
      };

      if (!response.ok || data.error) {
        setFetchError(data.error || 'Failed to fetch ad accounts');
        return;
      }

      setAccounts(data.accounts || []);
    } catch {
      setFetchError('Failed to fetch Google Ads accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (account: {
    externalAccountId: string;
    name: string;
  }) => {
    if (!token) return;
    setConnecting(account.externalAccountId);

    try {
      const response = await fetch('/api/google/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: token,
          refreshToken: refreshToken || undefined,
          googleAccountId: account.externalAccountId,
          googleAccountName: account.name,
        }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        setFetchError(data.error || 'Failed to connect account');
        return;
      }

      setConnected((prev) => new Set(prev).add(account.externalAccountId));
    } catch {
      setFetchError('Failed to connect account');
    } finally {
      setConnecting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm text-gray-500">
          Loading your Google Ads accounts...
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
          className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Back to Integrations
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-2 text-lg font-semibold">
        Select Ad Accounts to Connect
      </h2>
      <p className="mb-6 text-sm text-gray-500">
        Choose which Google Ads accounts you want to sync with your dashboard.
      </p>

      {fetchError && (
        <p className="mb-4 text-sm text-red-600">{fetchError}</p>
      )}

      <div className="space-y-3">
        {accounts.map((account) => (
          <div
            key={account.externalAccountId}
            className="flex items-center justify-between rounded-lg border bg-white p-4"
          >
            <div>
              <p className="text-sm font-medium">{account.name}</p>
              <p className="text-xs text-gray-500">
                ID: {account.externalAccountId} | {account.currency} |{' '}
                {account.timezone}
              </p>
            </div>
            {connected.has(account.externalAccountId) ? (
              <span className="inline-flex items-center gap-1 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                Connected
              </span>
            ) : (
              <button
                onClick={() => handleConnect(account)}
                disabled={connecting === account.externalAccountId}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {connecting === account.externalAccountId ? (
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

export default function GoogleCallbackPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Connect Google Ads Accounts</h1>
      <div className="rounded-lg border bg-white p-6">
        <Suspense
          fallback={
            <div className="flex items-center gap-2 py-8 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </div>
          }
        >
          <GoogleCallbackContent />
        </Suspense>
      </div>
    </div>
  );
}
