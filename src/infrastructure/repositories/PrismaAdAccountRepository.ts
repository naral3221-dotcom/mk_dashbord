import { PrismaClient } from '@/generated/prisma';
import { AdAccount } from '@/domain/entities/AdAccount';
import { Platform } from '@/domain/entities/types';
import { IAdAccountRepository } from '@/domain/repositories/IAdAccountRepository';

export class PrismaAdAccountRepository implements IAdAccountRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<AdAccount | null> {
    const record = await this.prisma.adAccount.findUnique({
      where: { id },
    });

    if (!record) return null;

    return this.toDomain(record);
  }

  async findByOrganizationId(organizationId: string): Promise<AdAccount[]> {
    const records = await this.prisma.adAccount.findMany({
      where: { organizationId },
    });

    return records.map((record) => this.toDomain(record));
  }

  async findByPlatform(organizationId: string, platform: Platform): Promise<AdAccount[]> {
    const records = await this.prisma.adAccount.findMany({
      where: { organizationId, platform },
    });

    return records.map((record) => this.toDomain(record));
  }

  async findByPlatformAndAccountId(
    organizationId: string,
    platform: Platform,
    accountId: string
  ): Promise<AdAccount | null> {
    const record = await this.prisma.adAccount.findUnique({
      where: {
        platform_accountId_organizationId: {
          organizationId,
          platform,
          accountId,
        },
      },
    });

    if (!record) return null;

    return this.toDomain(record);
  }

  async findActiveByOrganizationId(organizationId: string): Promise<AdAccount[]> {
    const records = await this.prisma.adAccount.findMany({
      where: { organizationId, isActive: true },
    });

    return records.map((record) => this.toDomain(record));
  }

  async findWithExpiredTokens(): Promise<AdAccount[]> {
    const records = await this.prisma.adAccount.findMany({
      where: {
        isActive: true,
        tokenExpiresAt: {
          not: null,
          lte: new Date(),
        },
      },
    });

    return records.map((record) => this.toDomain(record));
  }

  async save(adAccount: AdAccount): Promise<AdAccount> {
    const data = adAccount.toObject();

    const record = await this.prisma.adAccount.upsert({
      where: { id: data.id },
      create: {
        id: data.id,
        platform: data.platform,
        accountId: data.accountId,
        accountName: data.accountName,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        tokenExpiresAt: data.tokenExpiresAt,
        isActive: data.isActive,
        organizationId: data.organizationId,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      },
      update: {
        platform: data.platform,
        accountId: data.accountId,
        accountName: data.accountName,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        tokenExpiresAt: data.tokenExpiresAt,
        isActive: data.isActive,
        updatedAt: data.updatedAt,
      },
    });

    return this.toDomain(record);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.adAccount.delete({
      where: { id },
    });
  }

  async countByOrganizationId(organizationId: string): Promise<number> {
    return this.prisma.adAccount.count({
      where: { organizationId },
    });
  }

  private toDomain(record: {
    id: string;
    platform: string;
    accountId: string;
    accountName: string;
    accessToken: string | null;
    refreshToken: string | null;
    tokenExpiresAt: Date | null;
    isActive: boolean;
    organizationId: string;
    createdAt: Date;
    updatedAt: Date;
  }): AdAccount {
    return AdAccount.reconstruct({
      id: record.id,
      platform: record.platform as Platform,
      accountId: record.accountId,
      accountName: record.accountName,
      accessToken: record.accessToken,
      refreshToken: record.refreshToken,
      tokenExpiresAt: record.tokenExpiresAt,
      isActive: record.isActive,
      organizationId: record.organizationId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
