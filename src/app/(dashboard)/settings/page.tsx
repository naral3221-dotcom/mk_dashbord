import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const user = await requireAuth();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <div className="rounded-lg border bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">Organization</h2>
        <div className="space-y-2 text-sm">
          <p><span className="font-medium">Organization ID:</span> {user.organizationId}</p>
          <p><span className="font-medium">Role:</span> {user.role}</p>
          <p><span className="font-medium">Email:</span> {user.email}</p>
        </div>
      </div>
    </div>
  );
}
