import { ValidationError } from '../errors';

export interface BillingEventProps {
  readonly id: string;
  readonly organizationId: string;
  readonly eventType: string;
  readonly stripeEventId: string;
  readonly data: Record<string, unknown>;
  readonly createdAt: Date;
}

export interface CreateBillingEventProps {
  readonly organizationId: string;
  readonly eventType: string;
  readonly stripeEventId: string;
  readonly data: Record<string, unknown>;
}

export class BillingEvent {
  private constructor(private readonly props: BillingEventProps) {}

  static create(
    props: CreateBillingEventProps,
    id: string = crypto.randomUUID()
  ): BillingEvent {
    if (!props.organizationId || props.organizationId.trim().length === 0) {
      throw new ValidationError('Organization ID is required');
    }

    if (!props.eventType || props.eventType.trim().length === 0) {
      throw new ValidationError('Event type is required');
    }

    if (!props.stripeEventId || props.stripeEventId.trim().length === 0) {
      throw new ValidationError('Stripe event ID is required');
    }

    const now = new Date();

    return new BillingEvent({
      id,
      organizationId: props.organizationId.trim(),
      eventType: props.eventType.trim(),
      stripeEventId: props.stripeEventId.trim(),
      data: { ...props.data },
      createdAt: now,
    });
  }

  static reconstruct(props: BillingEventProps): BillingEvent {
    return new BillingEvent(props);
  }

  get id(): string { return this.props.id; }
  get organizationId(): string { return this.props.organizationId; }
  get eventType(): string { return this.props.eventType; }
  get stripeEventId(): string { return this.props.stripeEventId; }
  get data(): Record<string, unknown> { return this.props.data; }
  get createdAt(): Date { return this.props.createdAt; }

  toObject(): BillingEventProps {
    return { ...this.props, data: { ...this.props.data } };
  }
}
