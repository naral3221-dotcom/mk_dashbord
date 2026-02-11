'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface AcceptInvitationButtonProps {
  token: string;
}

export function AcceptInvitationButton({ token }: AcceptInvitationButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAccept = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/invitations/${token}/accept`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '초대 수락에 실패했습니다');
      }

      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : '문제가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleAccept}
        disabled={loading}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? '수락 중...' : '초대 수락'}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
