'use client';

interface RoleSelectProps {
  currentRole: string;
  onChange: (role: string) => void;
}

export function RoleSelect({ currentRole, onChange }: RoleSelectProps) {
  return (
    <select
      value={currentRole}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border border-gray-300 px-2 py-1 text-xs"
    >
      <option value="ADMIN">Admin</option>
      <option value="MEMBER">Member</option>
      <option value="VIEWER">Viewer</option>
    </select>
  );
}
