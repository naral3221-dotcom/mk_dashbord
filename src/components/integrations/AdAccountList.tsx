'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface AdAccountItem {
  id: string;
  platform: string;
  accountId: string;
  accountName: string;
  isActive: boolean;
  tokenExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  organizationId: string;
  platform?: string;
}

const PLATFORM_LABELS: Record<string, string> = {
  META: 'META',
  GOOGLE: 'Google',
  TIKTOK: 'TikTok',
  NAVER: 'Naver',
  KAKAO: 'Kakao',
};

function PlatformBadge({ platform }: { platform: string }) {
  const colorMap: Record<string, string> = {
    META: 'bg-blue-100 text-blue-800',
    GOOGLE: 'bg-red-100 text-red-800',
    TIKTOK: 'bg-gray-100 text-gray-800',
    NAVER: 'bg-green-100 text-green-800',
    KAKAO: 'bg-yellow-100 text-yellow-800',
  };

  const colorClass = colorMap[platform] ?? 'bg-gray-100 text-gray-800';
  const label = PLATFORM_LABELS[platform] ?? platform;

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}>
      {label}
    </span>
  );
}

export function AdAccountList({ organizationId, platform }: Props) {
  const [accounts, setAccounts] = useState<AdAccountItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAccounts();
  }, [organizationId, platform]);

  const fetchAccounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ organizationId });
      if (platform) {
        params.set('platform', platform);
      }

      const response = await fetch(`/api/accounts?${params.toString()}`);
      const data = await response.json() as { accounts?: AdAccountItem[]; error?: string };

      if (!response.ok) {
        setError(data.error || 'Failed to fetch accounts');
        return;
      }

      setAccounts(data.accounts || []);
    } catch {
      setError('Failed to fetch accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (accountId: string, accountPlatform: string) => {
    setSyncing(accountId);
    try {
      // Route sync to the correct platform endpoint
      let syncUrl = '/api/meta/sync/campaigns';
      if (accountPlatform === 'GOOGLE') {
        syncUrl = '/api/google/sync/campaigns';
      } else if (accountPlatform === 'TIKTOK') {
        syncUrl = '/api/tiktok/sync/campaigns';
      } else if (accountPlatform === 'NAVER') {
        syncUrl = '/api/naver/sync/campaigns';
      }

      const response = await fetch(syncUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adAccountId: accountId }),
      });
      const data = await response.json() as { synced?: number; error?: string };

      if (!response.ok) {
        setError(data.error || 'Sync failed');
        return;
      }

      // Refresh account list after sync
      await fetchAccounts();
    } catch {
      setError('Sync failed');
    } finally {
      setSyncing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading accounts...
      </div>
    );
  }

  if (accounts.length === 0) {
    const platformLabel = platform ? PLATFORM_LABELS[platform] ?? platform : '';
    return (
      <p className="py-8 text-center text-sm text-gray-500">
        No {platformLabel} accounts connected yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      {accounts.map((account) => (
        <div
          key={account.id}
          className="flex items-center justify-between rounded-lg border bg-white p-4"
        >
          <div className="flex items-center gap-3">
            {account.isActive ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-gray-400" />
            )}
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">{account.accountName}</p>
                {!platform && <PlatformBadge platform={account.platform} />}
              </div>
              <p className="text-xs text-gray-500">ID: {account.accountId}</p>
              {account.tokenExpiresAt && (
                <p className="text-xs text-gray-400">
                  Token expires: {new Date(account.tokenExpiresAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => handleSync(account.id, account.platform)}
            disabled={syncing === account.id || !account.isActive}
            className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            {syncing === account.id ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
            Sync
          </button>
        </div>
      ))}
    </div>
  );
}
