'use client';

import { useState } from 'react';
import { ExternalLink, Loader2 } from 'lucide-react';

export function MetaConnectButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/meta/auth');
      const data = await response.json() as { authUrl?: string; error?: string };

      if (!response.ok) {
        setError(data.error || 'Failed to initiate META connection');
        return;
      }

      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch {
      setError('Failed to connect to META');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleConnect}
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ExternalLink className="h-4 w-4" />
        )}
        {loading ? 'Connecting...' : 'Connect META Account'}
      </button>
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
