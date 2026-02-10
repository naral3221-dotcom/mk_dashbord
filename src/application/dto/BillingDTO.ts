import { Plan, SubscriptionStatus } from '@/domain/entities/types';

// --- Request types ---
export interface CreateCheckoutRequest {
  plan: Plan;
  successUrl: string;
  cancelUrl: string;
}

export interface CreatePortalRequest {
  returnUrl: string;
}

// --- Response types ---
export interface CreateCheckoutResponse {
  sessionId: string;
  url: string;
}

export interface CreatePortalResponse {
  url: string;
}

export interface SubscriptionResponse {
  subscription: {
    id: string;
    plan: Plan;
    status: SubscriptionStatus;
    currentPeriodStart: string; // ISO string
    currentPeriodEnd: string; // ISO string
    cancelAtPeriodEnd: boolean;
    canceledAt: string | null; // ISO string
  } | null;
  plan: Plan;
}

export interface PlanFeatureCheck {
  feature: string;
  allowed: boolean;
  reason?: string;
  currentUsage?: number;
  limit?: number;
}

export interface UsageResponse {
  plan: Plan;
  features: PlanFeatureCheck[];
}

// --- Mapper functions ---
export function toSubscriptionResponse(output: {
  subscription: {
    id: string;
    plan: Plan;
    status: SubscriptionStatus;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
    canceledAt: Date | null;
  } | null;
  plan: Plan;
}): SubscriptionResponse {
  return {
    subscription: output.subscription
      ? {
          id: output.subscription.id,
          plan: output.subscription.plan,
          status: output.subscription.status,
          currentPeriodStart: output.subscription.currentPeriodStart.toISOString(),
          currentPeriodEnd: output.subscription.currentPeriodEnd.toISOString(),
          cancelAtPeriodEnd: output.subscription.cancelAtPeriodEnd,
          canceledAt: output.subscription.canceledAt?.toISOString() ?? null,
        }
      : null,
    plan: output.plan,
  };
}
