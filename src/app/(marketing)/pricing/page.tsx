'use client';

import { useRouter } from 'next/navigation';
import { PricingTable } from '@/components/billing/PricingTable';
import { Plan } from '@/domain/entities/types';

export default function PricingPage() {
  const router = useRouter();

  const handleSelectPlan = (plan: Plan) => {
    if (plan === Plan.FREE) {
      router.push('/sign-up');
    } else {
      router.push(`/settings/billing?upgrade=${plan}`);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">
            Simple, transparent pricing
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Choose the plan that fits your marketing analytics needs
          </p>
        </div>
        <div className="mt-16">
          <PricingTable onSelectPlan={handleSelectPlan} />
        </div>
      </div>
    </div>
  );
}
