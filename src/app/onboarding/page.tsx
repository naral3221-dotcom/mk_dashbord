import { redirect } from 'next/navigation';
import { auth } from '@/infrastructure/auth/nextauth.config';
import { OnboardingForm } from '@/components/onboarding/OnboardingForm';

export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) redirect('/sign-in');

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-6 rounded-lg border bg-white p-8 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold">Create Your Organization</h1>
          <p className="mt-2 text-sm text-gray-600">
            Set up your organization to get started with marketing analytics.
          </p>
        </div>
        <OnboardingForm />
      </div>
    </div>
  );
}
