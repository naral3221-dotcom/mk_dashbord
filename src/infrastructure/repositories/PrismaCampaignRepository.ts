import { PrismaClient } from '@/generated/prisma';
import { Campaign } from '@/domain/entities/Campaign';
import { CampaignStatus } from '@/domain/entities/types';
import { ICampaignRepository } from '@/domain/repositories/ICampaignRepository';

export class PrismaCampaignRepository implements ICampaignRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Campaign | null> {
    const record = await this.prisma.campaign.findUnique({
      where: { id },
    });

    if (!record) return null;

    return this.toDomain(record);
  }

  async findByAdAccountId(adAccountId: string): Promise<Campaign[]> {
    const records = await this.prisma.campaign.findMany({
      where: { adAccountId },
    });

    return records.map((record) => this.toDomain(record));
  }

  async findByExternalId(adAccountId: string, externalId: string): Promise<Campaign | null> {
    const record = await this.prisma.campaign.findUnique({
      where: {
        externalId_adAccountId: {
          adAccountId,
          externalId,
        },
      },
    });

    if (!record) return null;

    return this.toDomain(record);
  }

  async findByStatus(adAccountId: string, status: CampaignStatus): Promise<Campaign[]> {
    const records = await this.prisma.campaign.findMany({
      where: { adAccountId, status },
    });

    return records.map((record) => this.toDomain(record));
  }

  async findActiveCampaigns(adAccountId: string): Promise<Campaign[]> {
    const records = await this.prisma.campaign.findMany({
      where: { adAccountId, status: 'ACTIVE' },
    });

    return records.map((record) => this.toDomain(record));
  }

  async save(campaign: Campaign): Promise<Campaign> {
    const data = campaign.toObject();

    const record = await this.prisma.campaign.upsert({
      where: { id: data.id },
      create: {
        id: data.id,
        externalId: data.externalId,
        name: data.name,
        status: data.status,
        adAccountId: data.adAccountId,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      },
      update: {
        externalId: data.externalId,
        name: data.name,
        status: data.status,
        updatedAt: data.updatedAt,
      },
    });

    return this.toDomain(record);
  }

  async saveMany(campaigns: Campaign[]): Promise<Campaign[]> {
    const results = await this.prisma.$transaction(
      campaigns.map((campaign) => {
        const data = campaign.toObject();
        return this.prisma.campaign.upsert({
          where: { id: data.id },
          create: {
            id: data.id,
            externalId: data.externalId,
            name: data.name,
            status: data.status,
            adAccountId: data.adAccountId,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          },
          update: {
            externalId: data.externalId,
            name: data.name,
            status: data.status,
            updatedAt: data.updatedAt,
          },
        });
      })
    );

    return results.map((record) => this.toDomain(record));
  }

  async delete(id: string): Promise<void> {
    await this.prisma.campaign.delete({
      where: { id },
    });
  }

  async countByStatus(adAccountId: string, status: CampaignStatus): Promise<number> {
    return this.prisma.campaign.count({
      where: { adAccountId, status },
    });
  }

  private toDomain(record: {
    id: string;
    externalId: string;
    name: string;
    status: string;
    adAccountId: string;
    createdAt: Date;
    updatedAt: Date;
  }): Campaign {
    return Campaign.reconstruct({
      id: record.id,
      externalId: record.externalId,
      name: record.name,
      status: record.status as CampaignStatus,
      adAccountId: record.adAccountId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
