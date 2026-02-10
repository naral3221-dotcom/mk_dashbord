import { Plan } from '@/domain/entities/types';

export const StripePriceConfig: Record<Exclude<Plan, Plan.FREE>, string> = {
  [Plan.STARTER]: process.env.STRIPE_STARTER_PRICE_ID || 'price_starter_default',
  [Plan.PRO]: process.env.STRIPE_PRO_PRICE_ID || 'price_pro_default',
  [Plan.ENTERPRISE]: process.env.STRIPE_ENTERPRISE_PRICE_ID || 'price_enterprise_default',
};

export function getPriceIdForPlan(plan: Plan): string {
  if (plan === Plan.FREE) {
    throw new Error('Free plan does not have a Stripe price');
  }
  return StripePriceConfig[plan];
}

export function planFromPriceId(priceId: string): Plan {
  for (const [plan, id] of Object.entries(StripePriceConfig)) {
    if (id === priceId) {
      return plan as Plan;
    }
  }
  throw new Error(`Unknown Stripe price ID: ${priceId}`);
}
