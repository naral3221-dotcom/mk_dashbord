import { CampaignStatus } from './types';
import { ValidationError } from '../errors';

export interface CampaignProps {
  readonly id: string;
  readonly externalId: string;
  readonly name: string;
  readonly status: CampaignStatus;
  readonly adAccountId: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateCampaignProps {
  readonly externalId: string;
  readonly name: string;
  readonly adAccountId: string;
  readonly status?: CampaignStatus;
}

export class Campaign {
  private constructor(private readonly props: CampaignProps) {}

  static create(
    props: CreateCampaignProps,
    id: string = crypto.randomUUID()
  ): Campaign {
    if (!props.externalId || props.externalId.trim().length === 0) {
      throw new ValidationError('External campaign ID is required');
    }

    if (!props.name || props.name.trim().length === 0) {
      throw new ValidationError('Campaign name is required');
    }

    if (!props.adAccountId) {
      throw new ValidationError('Ad account ID is required');
    }

    const now = new Date();

    return new Campaign({
      id,
      externalId: props.externalId.trim(),
      name: props.name.trim(),
      status: props.status ?? CampaignStatus.ACTIVE,
      adAccountId: props.adAccountId,
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstruct(props: CampaignProps): Campaign {
    return new Campaign(props);
  }

  get id(): string { return this.props.id; }
  get externalId(): string { return this.props.externalId; }
  get name(): string { return this.props.name; }
  get status(): CampaignStatus { return this.props.status; }
  get adAccountId(): string { return this.props.adAccountId; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  updateName(name: string): Campaign {
    if (!name || name.trim().length === 0) {
      throw new ValidationError('Campaign name is required');
    }

    return new Campaign({
      ...this.props,
      name: name.trim(),
      updatedAt: new Date(),
    });
  }

  changeStatus(newStatus: CampaignStatus): Campaign {
    if (this.props.status === newStatus) {
      return this;
    }

    if (this.props.status === CampaignStatus.DELETED) {
      throw new ValidationError('Cannot change status of deleted campaign');
    }

    return new Campaign({
      ...this.props,
      status: newStatus,
      updatedAt: new Date(),
    });
  }

  pause(): Campaign {
    return this.changeStatus(CampaignStatus.PAUSED);
  }

  activate(): Campaign {
    return this.changeStatus(CampaignStatus.ACTIVE);
  }

  archive(): Campaign {
    return this.changeStatus(CampaignStatus.ARCHIVED);
  }

  delete(): Campaign {
    return this.changeStatus(CampaignStatus.DELETED);
  }

  isActive(): boolean {
    return this.props.status === CampaignStatus.ACTIVE;
  }

  toObject(): CampaignProps {
    return { ...this.props };
  }
}
