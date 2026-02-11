import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const user = await requireAuth();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">설정</h1>
      <div className="rounded-lg border bg-white p-6">
        <h2 className="text-lg font-semibold mb-4">조직</h2>
        <div className="space-y-2 text-sm">
          <p><span className="font-medium">조직 ID:</span> {user.organizationId}</p>
          <p><span className="font-medium">역할:</span> {user.role}</p>
          <p><span className="font-medium">이메일:</span> {user.email}</p>
        </div>
      </div>
    </div>
  );
}
