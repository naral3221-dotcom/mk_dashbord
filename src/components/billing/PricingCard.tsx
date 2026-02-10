'use client';

import { Plan } from '@/domain/entities/types';

export interface PricingCardProps {
  plan: Plan;
  name: string;
  price: string;
  description: string;
  features: string[];
  isCurrentPlan: boolean;
  onSelect?: () => void;
  ctaText?: string;
  highlighted?: boolean;
}

export function PricingCard({
  plan,
  name,
  price,
  description,
  features,
  isCurrentPlan,
  onSelect,
  ctaText = 'Get Started',
  highlighted = false,
}: PricingCardProps) {
  return (
    <div
      data-testid={`pricing-card-${plan}`}
      className={`rounded-lg border p-6 flex flex-col ${
        highlighted ? 'border-blue-500 ring-2 ring-blue-500 shadow-lg' : 'border-gray-200'
      }`}
    >
      <h3 className="text-lg font-semibold">{name}</h3>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
      <div className="mt-4">
        <span className="text-3xl font-bold" data-testid="pricing-price">{price}</span>
      </div>
      <ul className="mt-6 flex-1 space-y-3">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center gap-2 text-sm">
            <span className="text-green-500">✓</span>
            {feature}
          </li>
        ))}
      </ul>
      <div className="mt-6">
        {isCurrentPlan ? (
          <span
            data-testid="current-plan-badge"
            className="inline-block w-full rounded-lg bg-gray-100 py-2 text-center text-sm font-medium text-gray-600"
          >
            Current Plan
          </span>
        ) : (
          <button
            data-testid="pricing-cta"
            onClick={onSelect}
            className={`w-full rounded-lg py-2 text-sm font-medium transition-colors ${
              highlighted
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-900 text-white hover:bg-gray-800'
            }`}
          >
            {ctaText}
          </button>
        )}
      </div>
    </div>
  );
}
