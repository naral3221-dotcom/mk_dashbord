import { PrismaClient } from '@/generated/prisma';
import { CampaignInsight } from '@/domain/entities/CampaignInsight';
import { ICampaignInsightRepository, DateRange } from '@/domain/repositories/ICampaignInsightRepository';

export class PrismaCampaignInsightRepository implements ICampaignInsightRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<CampaignInsight | null> {
    const record = await this.prisma.campaignInsight.findUnique({
      where: { id },
    });

    if (!record) return null;

    return this.toDomain(record);
  }

  async findByCampaignId(campaignId: string): Promise<CampaignInsight[]> {
    const records = await this.prisma.campaignInsight.findMany({
      where: { campaignId },
    });

    return records.map((record) => this.toDomain(record));
  }

  async findByCampaignAndDateRange(
    campaignId: string,
    dateRange: DateRange
  ): Promise<CampaignInsight[]> {
    const records = await this.prisma.campaignInsight.findMany({
      where: {
        campaignId,
        date: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      },
    });

    return records.map((record) => this.toDomain(record));
  }

  async findByCampaignAndDate(
    campaignId: string,
    date: Date
  ): Promise<CampaignInsight | null> {
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);

    const record = await this.prisma.campaignInsight.findFirst({
      where: {
        campaignId,
        date: normalizedDate,
      },
    });

    if (!record) return null;

    return this.toDomain(record);
  }

  async save(insight: CampaignInsight): Promise<CampaignInsight> {
    const data = insight.toObject();

    const record = await this.prisma.campaignInsight.upsert({
      where: { id: data.id },
      create: {
        id: data.id,
        date: data.date,
        spend: data.spend,
        impressions: data.impressions,
        clicks: data.clicks,
        conversions: data.conversions,
        revenue: data.revenue,
        campaignId: data.campaignId,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      },
      update: {
        date: data.date,
        spend: data.spend,
        impressions: data.impressions,
        clicks: data.clicks,
        conversions: data.conversions,
        revenue: data.revenue,
        updatedAt: data.updatedAt,
      },
    });

    return this.toDomain(record);
  }

  async saveMany(insights: CampaignInsight[]): Promise<CampaignInsight[]> {
    const results = await this.prisma.$transaction(
      insights.map((insight) => {
        const data = insight.toObject();
        return this.prisma.campaignInsight.upsert({
          where: { id: data.id },
          create: {
            id: data.id,
            date: data.date,
            spend: data.spend,
            impressions: data.impressions,
            clicks: data.clicks,
            conversions: data.conversions,
            revenue: data.revenue,
            campaignId: data.campaignId,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          },
          update: {
            date: data.date,
            spend: data.spend,
            impressions: data.impressions,
            clicks: data.clicks,
            conversions: data.conversions,
            revenue: data.revenue,
            updatedAt: data.updatedAt,
          },
        });
      })
    );

    return results.map((record) => this.toDomain(record));
  }

  async delete(id: string): Promise<void> {
    await this.prisma.campaignInsight.delete({
      where: { id },
    });
  }

  async deleteOlderThan(date: Date): Promise<number> {
    const result = await this.prisma.campaignInsight.deleteMany({
      where: {
        date: { lt: date },
      },
    });

    return result.count;
  }

  private toDomain(record: {
    id: string;
    date: Date;
    spend: unknown;
    impressions: number;
    clicks: number;
    conversions: number;
    revenue: unknown;
    campaignId: string;
    createdAt: Date;
    updatedAt: Date;
  }): CampaignInsight {
    return CampaignInsight.reconstruct({
      id: record.id,
      date: record.date,
      spend: Number(record.spend),
      impressions: record.impressions,
      clicks: record.clicks,
      conversions: record.conversions,
      revenue: Number(record.revenue),
      campaignId: record.campaignId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
