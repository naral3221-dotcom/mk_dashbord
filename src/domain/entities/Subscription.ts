import { Plan, SubscriptionStatus } from './types';
import { ValidationError } from '../errors';

export interface SubscriptionProps {
  readonly id: string;
  readonly organizationId: string;
  readonly stripeSubscriptionId: string;
  readonly stripePriceId: string;
  readonly plan: Plan;
  readonly status: SubscriptionStatus;
  readonly currentPeriodStart: Date;
  readonly currentPeriodEnd: Date;
  readonly cancelAtPeriodEnd: boolean;
  readonly canceledAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateSubscriptionProps {
  readonly organizationId: string;
  readonly stripeSubscriptionId: string;
  readonly stripePriceId: string;
  readonly plan: Plan;
  readonly status: SubscriptionStatus;
  readonly currentPeriodStart: Date;
  readonly currentPeriodEnd: Date;
}

export class Subscription {
  private constructor(private readonly props: SubscriptionProps) {}

  static create(
    props: CreateSubscriptionProps,
    id: string = crypto.randomUUID()
  ): Subscription {
    if (!props.organizationId || props.organizationId.trim().length === 0) {
      throw new ValidationError('Organization ID is required');
    }

    if (!props.stripeSubscriptionId || props.stripeSubscriptionId.trim().length === 0) {
      throw new ValidationError('Stripe subscription ID is required');
    }

    if (!props.stripePriceId || props.stripePriceId.trim().length === 0) {
      throw new ValidationError('Stripe price ID is required');
    }

    if (props.currentPeriodEnd <= props.currentPeriodStart) {
      throw new ValidationError('Current period end must be after current period start');
    }

    const now = new Date();

    return new Subscription({
      id,
      organizationId: props.organizationId,
      stripeSubscriptionId: props.stripeSubscriptionId,
      stripePriceId: props.stripePriceId,
      plan: props.plan,
      status: props.status,
      currentPeriodStart: props.currentPeriodStart,
      currentPeriodEnd: props.currentPeriodEnd,
      cancelAtPeriodEnd: false,
      canceledAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstruct(props: SubscriptionProps): Subscription {
    return new Subscription(props);
  }

  get id(): string {
    return this.props.id;
  }

  get organizationId(): string {
    return this.props.organizationId;
  }

  get stripeSubscriptionId(): string {
    return this.props.stripeSubscriptionId;
  }

  get stripePriceId(): string {
    return this.props.stripePriceId;
  }

  get plan(): Plan {
    return this.props.plan;
  }

  get status(): SubscriptionStatus {
    return this.props.status;
  }

  get currentPeriodStart(): Date {
    return this.props.currentPeriodStart;
  }

  get currentPeriodEnd(): Date {
    return this.props.currentPeriodEnd;
  }

  get cancelAtPeriodEnd(): boolean {
    return this.props.cancelAtPeriodEnd;
  }

  get canceledAt(): Date | null {
    return this.props.canceledAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  isActive(): boolean {
    return this.props.status === SubscriptionStatus.ACTIVE || this.props.status === SubscriptionStatus.TRIALING;
  }

  isCanceling(): boolean {
    return this.props.cancelAtPeriodEnd === true && this.props.status !== SubscriptionStatus.CANCELED;
  }

  isPastDue(): boolean {
    return this.props.status === SubscriptionStatus.PAST_DUE;
  }

  updateStatus(newStatus: SubscriptionStatus): Subscription {
    return new Subscription({
      ...this.props,
      status: newStatus,
      updatedAt: new Date(),
    });
  }

  updatePeriod(start: Date, end: Date): Subscription {
    if (end <= start) {
      throw new ValidationError('Current period end must be after current period start');
    }

    return new Subscription({
      ...this.props,
      currentPeriodStart: start,
      currentPeriodEnd: end,
      updatedAt: new Date(),
    });
  }

  markCanceled(canceledAt: Date): Subscription {
    return new Subscription({
      ...this.props,
      status: SubscriptionStatus.CANCELED,
      canceledAt,
      updatedAt: new Date(),
    });
  }

  setCancelAtPeriodEnd(value: boolean): Subscription {
    return new Subscription({
      ...this.props,
      cancelAtPeriodEnd: value,
      updatedAt: new Date(),
    });
  }

  changePlan(newPlan: Plan, newPriceId: string): Subscription {
    if (!newPriceId || newPriceId.trim().length === 0) {
      throw new ValidationError('Stripe price ID is required');
    }

    return new Subscription({
      ...this.props,
      plan: newPlan,
      stripePriceId: newPriceId,
      updatedAt: new Date(),
    });
  }

  toObject(): SubscriptionProps {
    return { ...this.props };
  }
}
