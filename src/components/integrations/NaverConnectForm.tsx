'use client';

import { useState } from 'react';

export function NaverConnectForm() {
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!apiKey || !apiSecret || !customerId) {
      setError('All fields are required');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch('/api/naver/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, apiSecret, customerId }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || 'Failed to connect');
      }

      setSuccess(true);
      setApiKey('');
      setApiSecret('');
      setCustomerId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="naver-connect-form">
      <div>
        <label htmlFor="naver-api-key" className="block text-sm font-medium text-gray-700">
          API Key
        </label>
        <input
          id="naver-api-key"
          type="text"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          placeholder="Enter API Key"
        />
      </div>
      <div>
        <label htmlFor="naver-api-secret" className="block text-sm font-medium text-gray-700">
          API Secret
        </label>
        <input
          id="naver-api-secret"
          type="password"
          value={apiSecret}
          onChange={(e) => setApiSecret(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          placeholder="Enter API Secret"
        />
      </div>
      <div>
        <label htmlFor="naver-customer-id" className="block text-sm font-medium text-gray-700">
          Customer ID
        </label>
        <input
          id="naver-customer-id"
          type="text"
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          placeholder="Enter Customer ID"
        />
      </div>
      {error && (
        <p className="text-sm text-red-600" data-testid="naver-error">
          {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-green-600" data-testid="naver-success">
          Connected successfully!
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-50"
        data-testid="naver-submit-button"
      >
        {loading ? 'Connecting...' : 'Connect Naver Ads'}
      </button>
    </form>
  );
}
