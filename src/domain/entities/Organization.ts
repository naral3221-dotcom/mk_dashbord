import { Plan } from './types';
import { ValidationError } from '../errors';

export interface OrganizationProps {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly plan: Plan;
  readonly stripeCustomerId: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateOrganizationProps {
  readonly name: string;
  readonly slug: string;
  readonly plan?: Plan;
}

export class Organization {
  private constructor(private readonly props: OrganizationProps) {}

  static create(
    props: CreateOrganizationProps,
    id: string = crypto.randomUUID()
  ): Organization {
    if (!props.name || props.name.trim().length === 0) {
      throw new ValidationError('Organization name is required');
    }

    if (props.name.length > 100) {
      throw new ValidationError('Organization name must be less than 100 characters');
    }

    if (!props.slug || !Organization.isValidSlug(props.slug.toLowerCase())) {
      throw new ValidationError('Invalid organization slug format');
    }

    const now = new Date();

    return new Organization({
      id,
      name: props.name.trim(),
      slug: props.slug.toLowerCase(),
      plan: props.plan ?? Plan.FREE,
      stripeCustomerId: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstruct(props: OrganizationProps): Organization {
    return new Organization(props);
  }

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get slug(): string {
    return this.props.slug;
  }

  get plan(): Plan {
    return this.props.plan;
  }

  get stripeCustomerId(): string | null {
    return this.props.stripeCustomerId;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  updateName(name: string): Organization {
    if (!name || name.trim().length === 0) {
      throw new ValidationError('Organization name is required');
    }

    if (name.length > 100) {
      throw new ValidationError('Organization name must be less than 100 characters');
    }

    return new Organization({
      ...this.props,
      name: name.trim(),
      updatedAt: new Date(),
    });
  }

  upgradePlan(newPlan: Plan): Organization {
    if (!Organization.canUpgradeTo(this.props.plan, newPlan)) {
      throw new ValidationError(`Cannot upgrade from ${this.props.plan} to ${newPlan}`);
    }

    return new Organization({
      ...this.props,
      plan: newPlan,
      updatedAt: new Date(),
    });
  }

  changePlan(newPlan: Plan): Organization {
    return new Organization({
      ...this.props,
      plan: newPlan,
      updatedAt: new Date(),
    });
  }

  setStripeCustomerId(customerId: string): Organization {
    if (!customerId || customerId.trim().length === 0) {
      throw new ValidationError('Stripe customer ID is required');
    }

    return new Organization({
      ...this.props,
      stripeCustomerId: customerId.trim(),
      updatedAt: new Date(),
    });
  }

  toObject(): OrganizationProps {
    return { ...this.props };
  }

  private static isValidSlug(slug: string): boolean {
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    return slugRegex.test(slug) && slug.length >= 3 && slug.length <= 50;
  }

  private static canUpgradeTo(currentPlan: Plan, newPlan: Plan): boolean {
    const planHierarchy = [Plan.FREE, Plan.STARTER, Plan.PRO, Plan.ENTERPRISE];
    const currentIndex = planHierarchy.indexOf(currentPlan);
    const newIndex = planHierarchy.indexOf(newPlan);
    return newIndex > currentIndex;
  }
}
