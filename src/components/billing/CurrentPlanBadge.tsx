'use client';

import { Plan } from '@/domain/entities/types';

export interface CurrentPlanBadgeProps {
  plan: Plan;
}

const planColors: Record<Plan, string> = {
  [Plan.FREE]: 'bg-gray-100 text-gray-700',
  [Plan.STARTER]: 'bg-blue-100 text-blue-700',
  [Plan.PRO]: 'bg-purple-100 text-purple-700',
  [Plan.ENTERPRISE]: 'bg-amber-100 text-amber-700',
};

export function CurrentPlanBadge({ plan }: CurrentPlanBadgeProps) {
  return (
    <span
      data-testid="current-plan-badge"
      className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${planColors[plan]}`}
    >
      {plan}
    </span>
  );
}
