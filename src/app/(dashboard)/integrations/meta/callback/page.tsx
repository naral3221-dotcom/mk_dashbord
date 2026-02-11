'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

function MetaCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const error = searchParams.get('error');

  const [accounts, setAccounts] = useState<Array<{
    id: string;
    name: string;
    account_id: string;
  }>>([]);
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
      setFetchError('토큰이 제공되지 않았습니다');
      setLoading(false);
      return;
    }

    // Fetch available ad accounts using the short-lived token
    fetchAdAccounts(token);
  }, [token, error]);

  const fetchAdAccounts = async (accessToken: string) => {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,account_id&access_token=${accessToken}`
      );
      const data = await response.json() as {
        data?: Array<{ id: string; name: string; account_id: string }>;
        error?: { message: string };
      };

      if (data.error) {
        setFetchError(data.error.message);
        return;
      }

      setAccounts(data.data || []);
    } catch {
      setFetchError('광고 계정을 불러오지 못했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (account: { id: string; name: string; account_id: string }) => {
    if (!token) return;
    setConnecting(account.account_id);

    try {
      const response = await fetch('/api/meta/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shortLivedToken: token,
          metaAccountId: account.account_id,
          metaAccountName: account.name,
        }),
      });

      if (!response.ok) {
        const data = await response.json() as { error?: string };
        setFetchError(data.error || '계정 연결에 실패했습니다');
        return;
      }

      setConnected((prev) => new Set(prev).add(account.account_id));
    } catch {
      setFetchError('계정 연결에 실패했습니다');
    } finally {
      setConnecting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm text-gray-500">META 광고 계정을 불러오는 중...</p>
      </div>
    );
  }

  if (fetchError && accounts.length === 0) {
    return (
      <div className="py-12 text-center">
        <XCircle className="mx-auto h-12 w-12 text-red-400" />
        <h2 className="mt-4 text-lg font-semibold">연결 실패</h2>
        <p className="mt-2 text-sm text-gray-500">{fetchError}</p>
        <button
          onClick={() => router.push('/integrations')}
          className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          연동 관리로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-2 text-lg font-semibold">연결할 광고 계정 선택</h2>
      <p className="mb-6 text-sm text-gray-500">
        대시보드와 동기화할 META 광고 계정을 선택하세요.
      </p>

      {fetchError && (
        <p className="mb-4 text-sm text-red-600">{fetchError}</p>
      )}

      <div className="space-y-3">
        {accounts.map((account) => (
          <div
            key={account.account_id}
            className="flex items-center justify-between rounded-lg border bg-white p-4"
          >
            <div>
              <p className="text-sm font-medium">{account.name}</p>
              <p className="text-xs text-gray-500">ID: {account.account_id}</p>
            </div>
            {connected.has(account.account_id) ? (
              <span className="inline-flex items-center gap-1 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                연결됨
              </span>
            ) : (
              <button
                onClick={() => handleConnect(account)}
                disabled={connecting === account.account_id}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {connecting === account.account_id ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  '연결'
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
          완료
        </button>
      </div>
    </div>
  );
}

export default function MetaCallbackPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">META 계정 연결</h1>
      <div className="rounded-lg border bg-white p-6">
        <Suspense
          fallback={
            <div className="flex items-center gap-2 py-8 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              로딩 중...
            </div>
          }
        >
          <MetaCallbackContent />
        </Suspense>
      </div>
    </div>
  );
}
