'use client';

import { useEffect, useState } from 'react';
import { RoleSelect } from './RoleSelect';

interface Member {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

interface MemberListProps {
  organizationId: string;
  currentUserId: string;
}

export function MemberList({ organizationId, currentUserId }: MemberListProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMembers();
  }, [organizationId]);

  const fetchMembers = async () => {
    try {
      const res = await fetch(`/api/members?organizationId=${organizationId}`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/members/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (res.ok) {
        fetchMembers();
      }
    } catch (err) {
      // Role change failed silently - could add error handling UI
    }
  };

  if (loading) return <p className="text-sm text-gray-500">Loading members...</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="pb-2 font-medium">Name</th>
            <th className="pb-2 font-medium">Email</th>
            <th className="pb-2 font-medium">Role</th>
            <th className="pb-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr key={member.id} className="border-b">
              <td className="py-3">{member.name || '-'}</td>
              <td className="py-3">{member.email}</td>
              <td className="py-3">
                <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium">
                  {member.role}
                </span>
              </td>
              <td className="py-3">
                {member.id !== currentUserId && (
                  <RoleSelect
                    currentRole={member.role}
                    onChange={(newRole) => handleRoleChange(member.id, newRole)}
                  />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
