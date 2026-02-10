import { requireAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await requireAuth();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-white p-6">
          <h3 className="text-sm font-medium text-gray-500">Total Spend</h3>
          <p className="mt-2 text-3xl font-bold">$0.00</p>
        </div>
        <div className="rounded-lg border bg-white p-6">
          <h3 className="text-sm font-medium text-gray-500">Impressions</h3>
          <p className="mt-2 text-3xl font-bold">0</p>
        </div>
        <div className="rounded-lg border bg-white p-6">
          <h3 className="text-sm font-medium text-gray-500">Clicks</h3>
          <p className="mt-2 text-3xl font-bold">0</p>
        </div>
        <div className="rounded-lg border bg-white p-6">
          <h3 className="text-sm font-medium text-gray-500">Conversions</h3>
          <p className="mt-2 text-3xl font-bold">0</p>
        </div>
      </div>
    </div>
  );
}
