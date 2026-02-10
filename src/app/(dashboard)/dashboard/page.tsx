import { requireAuth } from '@/lib/auth';
import { DashboardContent } from '@/components/dashboard/DashboardContent';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  await requireAuth();

  return <DashboardContent />;
}
