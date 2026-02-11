import { ValidationError } from '../errors';

export interface CampaignInsightProps {
  readonly id: string;
  readonly date: Date;
  readonly spend: number;
  readonly impressions: number;
  readonly clicks: number;
  readonly conversions: number;
  readonly revenue: number;
  readonly campaignId: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateCampaignInsightProps {
  readonly date: Date;
  readonly spend: number;
  readonly impressions: number;
  readonly clicks: number;
  readonly conversions: number;
  readonly revenue: number;
  readonly campaignId: string;
}

export class CampaignInsight {
  private constructor(private readonly props: CampaignInsightProps) {}

  static create(
    props: CreateCampaignInsightProps,
    id: string = crypto.randomUUID()
  ): CampaignInsight {
    if (!props.date) {
      throw new ValidationError('Date is required');
    }

    if (!props.campaignId) {
      throw new ValidationError('Campaign ID is required');
    }

    if (props.spend < 0) {
      throw new ValidationError('Spend cannot be negative');
    }

    if (props.impressions < 0) {
      throw new ValidationError('Impressions cannot be negative');
    }

    if (props.clicks < 0) {
      throw new ValidationError('Clicks cannot be negative');
    }

    if (props.conversions < 0) {
      throw new ValidationError('Conversions cannot be negative');
    }

    if (props.revenue < 0) {
      throw new ValidationError('Revenue cannot be negative');
    }

    const flooredImpressions = Math.floor(props.impressions);
    const flooredClicks = Math.floor(props.clicks);

    if (flooredClicks > flooredImpressions) {
      throw new ValidationError('Clicks cannot exceed impressions');
    }

    const now = new Date();

    return new CampaignInsight({
      id,
      date: CampaignInsight.normalizeDate(props.date),
      spend: CampaignInsight.roundToTwo(props.spend),
      impressions: flooredImpressions,
      clicks: flooredClicks,
      conversions: Math.floor(props.conversions),
      revenue: CampaignInsight.roundToTwo(props.revenue),
      campaignId: props.campaignId,
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstruct(props: CampaignInsightProps): CampaignInsight {
    return new CampaignInsight(props);
  }

  get id(): string { return this.props.id; }
  get date(): Date { return this.props.date; }
  get spend(): number { return this.props.spend; }
  get impressions(): number { return this.props.impressions; }
  get clicks(): number { return this.props.clicks; }
  get conversions(): number { return this.props.conversions; }
  get revenue(): number { return this.props.revenue; }
  get campaignId(): string { return this.props.campaignId; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  get ctr(): number {
    if (this.props.impressions === 0) return 0;
    return CampaignInsight.roundToTwo((this.props.clicks / this.props.impressions) * 100);
  }

  get cpc(): number {
    if (this.props.clicks === 0) return 0;
    return CampaignInsight.roundToTwo(this.props.spend / this.props.clicks);
  }

  get cpm(): number {
    if (this.props.impressions === 0) return 0;
    return CampaignInsight.roundToTwo((this.props.spend / this.props.impressions) * 1000);
  }

  get cvr(): number {
    if (this.props.clicks === 0) return 0;
    return CampaignInsight.roundToTwo((this.props.conversions / this.props.clicks) * 100);
  }

  get cpa(): number {
    if (this.props.conversions === 0) return 0;
    return CampaignInsight.roundToTwo(this.props.spend / this.props.conversions);
  }

  get roas(): number {
    if (this.props.spend === 0) return 0;
    return CampaignInsight.roundToTwo(this.props.revenue / this.props.spend);
  }

  get roi(): number {
    if (this.props.spend === 0) return 0;
    return CampaignInsight.roundToTwo(((this.props.revenue - this.props.spend) / this.props.spend) * 100);
  }

  get profit(): number {
    return CampaignInsight.roundToTwo(this.props.revenue - this.props.spend);
  }

  updateMetrics(updates: Partial<CreateCampaignInsightProps>): CampaignInsight {
    const newProps = {
      ...this.props,
      spend: updates.spend ?? this.props.spend,
      impressions: updates.impressions ?? this.props.impressions,
      clicks: updates.clicks ?? this.props.clicks,
      conversions: updates.conversions ?? this.props.conversions,
      revenue: updates.revenue ?? this.props.revenue,
      updatedAt: new Date(),
    };

    if (newProps.clicks > newProps.impressions) {
      throw new ValidationError('Clicks cannot exceed impressions');
    }

    return new CampaignInsight(newProps);
  }

  getAllMetrics() {
    return {
      ...this.toObject(),
      ctr: this.ctr,
      cpc: this.cpc,
      cpm: this.cpm,
      cvr: this.cvr,
      cpa: this.cpa,
      roas: this.roas,
      roi: this.roi,
      profit: this.profit,
    };
  }

  toObject(): CampaignInsightProps {
    return { ...this.props };
  }

  private static roundToTwo(num: number): number {
    return Math.round((num + Number.EPSILON) * 100) / 100;
  }

  private static normalizeDate(date: Date): Date {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  }
}
