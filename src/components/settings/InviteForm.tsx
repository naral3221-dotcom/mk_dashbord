'use client';

import { useState } from 'react';

interface InviteFormProps {
  organizationId: string;
}

export function InviteForm({ organizationId }: InviteFormProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('MEMBER');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '초대 전송에 실패했습니다');
      }

      setMessage('초대가 성공적으로 전송되었습니다!');
      setEmail('');
      setRole('MEMBER');
    } catch (err) {
      setError(err instanceof Error ? err.message : '문제가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-3 items-end">
      <div className="flex-1">
        <label htmlFor="invite-email" className="block text-sm font-medium text-gray-700">이메일</label>
        <input
          id="invite-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          placeholder="colleague@company.com"
          required
        />
      </div>
      <div>
        <label htmlFor="invite-role" className="block text-sm font-medium text-gray-700">역할</label>
        <select
          id="invite-role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="mt-1 block rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="ADMIN">관리자</option>
          <option value="MEMBER">멤버</option>
          <option value="VIEWER">뷰어</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? '보내는 중...' : '초대'}
      </button>
      {message && <p className="text-sm text-green-600 ml-2">{message}</p>}
      {error && <p className="text-sm text-red-600 ml-2">{error}</p>}
    </form>
  );
}
