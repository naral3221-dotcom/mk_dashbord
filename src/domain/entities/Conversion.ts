import { ValidationError } from '../errors';

export interface ConversionProps {
  readonly id: string;
  readonly timestamp: Date;
  readonly source: string | null;
  readonly medium: string | null;
  readonly campaign: string | null;
  readonly content: string | null;
  readonly term: string | null;
  readonly value: number;
  readonly trackingData: Record<string, unknown> | null;
  readonly organizationId: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateConversionProps {
  readonly timestamp: Date;
  readonly source?: string | null;
  readonly medium?: string | null;
  readonly campaign?: string | null;
  readonly content?: string | null;
  readonly term?: string | null;
  readonly value?: number;
  readonly trackingData?: Record<string, unknown> | null;
  readonly organizationId: string;
}

export class Conversion {
  private constructor(private readonly props: ConversionProps) {}

  static create(
    props: CreateConversionProps,
    id: string = crypto.randomUUID()
  ): Conversion {
    if (!props.timestamp) {
      throw new ValidationError('Timestamp is required');
    }

    if (!props.organizationId) {
      throw new ValidationError('Organization ID is required');
    }

    const value = props.value ?? 0;
    if (value < 0) {
      throw new ValidationError('Conversion value cannot be negative');
    }

    if (props.timestamp > new Date()) {
      throw new ValidationError('Conversion timestamp cannot be in the future');
    }

    const now = new Date();

    return new Conversion({
      id,
      timestamp: props.timestamp,
      source: props.source?.trim() ?? null,
      medium: props.medium?.trim() ?? null,
      campaign: props.campaign?.trim() ?? null,
      content: props.content?.trim() ?? null,
      term: props.term?.trim() ?? null,
      value: Conversion.roundToTwo(value),
      trackingData: props.trackingData ?? null,
      organizationId: props.organizationId,
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstruct(props: ConversionProps): Conversion {
    return new Conversion(props);
  }

  get id(): string { return this.props.id; }
  get timestamp(): Date { return this.props.timestamp; }
  get source(): string | null { return this.props.source; }
  get medium(): string | null { return this.props.medium; }
  get campaign(): string | null { return this.props.campaign; }
  get content(): string | null { return this.props.content; }
  get term(): string | null { return this.props.term; }
  get value(): number { return this.props.value; }
  get trackingData(): Record<string, unknown> | null { return this.props.trackingData; }
  get organizationId(): string { return this.props.organizationId; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  getTrackingValue(key: string): unknown {
    return this.props.trackingData?.[key] ?? null;
  }

  hasUtmParameters(): boolean {
    return !!(this.props.source || this.props.medium || this.props.campaign);
  }

  getUtmParameters(): {
    source: string | null;
    medium: string | null;
    campaign: string | null;
    content: string | null;
    term: string | null;
  } {
    return {
      source: this.props.source,
      medium: this.props.medium,
      campaign: this.props.campaign,
      content: this.props.content,
      term: this.props.term,
    };
  }

  toObject(): ConversionProps {
    return { ...this.props };
  }

  private static roundToTwo(num: number): number {
    return Math.round((num + Number.EPSILON) * 100) / 100;
  }
}
