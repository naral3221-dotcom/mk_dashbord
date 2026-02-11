'use client';

import { useState } from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';

export function TikTokConnectButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/tiktok/auth');
      const data = (await response.json()) as {
        url?: string;
        state?: string;
        error?: string;
      };

      if (!response.ok) {
        setError(data.error || 'TikTok Ads 연결을 시작하지 못했습니다');
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setError('TikTok Ads에 연결하지 못했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleConnect}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ExternalLink className="h-4 w-4" />
        )}
        {loading ? '연결 중...' : 'TikTok Ads 연결'}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
