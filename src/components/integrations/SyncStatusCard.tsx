'use client';

import { useState } from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';

interface Props {
  adAccountId: string;
  accountName: string;
}

interface SyncResult {
  synced: number;
  created: number;
  updated: number;
  errors: string[];
}

export function SyncStatusCard({ adAccountId, accountName }: Props) {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/meta/sync/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adAccountId }),
      });
      const data = await response.json() as SyncResult & { error?: string };

      if (!response.ok) {
        setError(data.error || '동기화에 실패했습니다');
        return;
      }

      setResult(data);
    } catch {
      setError('동기화에 실패했습니다');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">{accountName}</h4>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200 disabled:opacity-50"
        >
          {syncing ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
          {syncing ? '동기화 중...' : '지금 동기화'}
        </button>
      </div>

      {result && (
        <div className="mt-3 rounded-md bg-green-50 p-3 text-xs">
          <p className="font-medium text-green-800">
            {result.synced}개 캠페인 동기화 완료 (신규 {result.created}개, 업데이트 {result.updated}개)
          </p>
          {result.errors.length > 0 && (
            <div className="mt-1 text-red-600">
              {result.errors.map((err, i) => (
                <p key={i}>{err}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="mt-3 text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
