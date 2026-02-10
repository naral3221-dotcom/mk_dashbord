'use client';

import { Plan } from '@/domain/entities/types';
import { PricingCard } from './PricingCard';

export interface PricingTableProps {
  currentPlan?: Plan;
  onSelectPlan?: (plan: Plan) => void;
}

const plans = [
  {
    plan: Plan.FREE,
    name: 'Free',
    price: '$0',
    description: 'Get started with basic analytics',
    features: [
      '1 ad account',
      '2 team members',
      'Meta platform only',
      '30-day data retention',
    ],
  },
  {
    plan: Plan.PRO,
    name: 'Pro',
    price: '$49/mo',
    description: 'For growing marketing teams',
    features: [
      '10 ad accounts',
      '20 team members',
      'Meta, Google & TikTok',
      '1-year data retention',
      'Auto sync',
      'Data exports',
    ],
    highlighted: true,
  },
  {
    plan: Plan.ENTERPRISE,
    name: 'Enterprise',
    price: '$199/mo',
    description: 'For large organizations',
    features: [
      'Unlimited ad accounts',
      'Unlimited team members',
      'All 5 platforms',
      'Unlimited data retention',
      'Auto sync',
      'Data exports',
      'Priority support',
    ],
  },
];

export function PricingTable({ currentPlan = Plan.FREE, onSelectPlan }: PricingTableProps) {
  return (
    <div data-testid="pricing-table" className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
      {plans.map((p) => (
        <PricingCard
          key={p.plan}
          plan={p.plan}
          name={p.name}
          price={p.price}
          description={p.description}
          features={p.features}
          isCurrentPlan={p.plan === currentPlan}
          highlighted={p.highlighted}
          onSelect={() => onSelectPlan?.(p.plan)}
          ctaText={p.plan === Plan.FREE ? 'Sign Up Free' : 'Upgrade'}
        />
      ))}
    </div>
  );
}
