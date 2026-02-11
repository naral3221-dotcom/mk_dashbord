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
            간단하고 투명한 요금제
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            마케팅 분석 요구에 맞는 플랜을 선택하세요
          </p>
        </div>
        <div className="mt-16">
          <PricingTable onSelectPlan={handleSelectPlan} />
        </div>
      </div>
    </div>
  );
}
