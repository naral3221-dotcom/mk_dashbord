import { requirePermission } from '@/lib/auth';
import { MemberList } from '@/components/settings/MemberList';
import { InviteForm } from '@/components/settings/InviteForm';

export const dynamic = 'force-dynamic';

export default async function MembersPage() {
  const user = await requirePermission('canManageUsers');

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Team Members</h1>
      <div className="space-y-6">
        <div className="rounded-lg border bg-white p-6">
          <h2 className="text-lg font-semibold mb-4">Invite New Member</h2>
          <InviteForm organizationId={user.organizationId!} />
        </div>
        <div className="rounded-lg border bg-white p-6">
          <h2 className="text-lg font-semibold mb-4">Current Members</h2>
          <MemberList organizationId={user.organizationId!} currentUserId={user.userId} />
        </div>
      </div>
    </div>
  );
}
