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
        throw new Error(data.error || 'Failed to send invitation');
      }

      setMessage('Invitation sent successfully!');
      setEmail('');
      setRole('MEMBER');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-3 items-end">
      <div className="flex-1">
        <label htmlFor="invite-email" className="block text-sm font-medium text-gray-700">Email</label>
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
        <label htmlFor="invite-role" className="block text-sm font-medium text-gray-700">Role</label>
        <select
          id="invite-role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="mt-1 block rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="ADMIN">Admin</option>
          <option value="MEMBER">Member</option>
          <option value="VIEWER">Viewer</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Sending...' : 'Invite'}
      </button>
      {message && <p className="text-sm text-green-600 ml-2">{message}</p>}
      {error && <p className="text-sm text-red-600 ml-2">{error}</p>}
    </form>
  );
}
