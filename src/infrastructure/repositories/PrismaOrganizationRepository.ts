import { PrismaClient } from '@/generated/prisma';
import { Organization } from '@/domain/entities/Organization';
import { Plan } from '@/domain/entities/types';
import { IOrganizationRepository } from '@/domain/repositories/IOrganizationRepository';

export class PrismaOrganizationRepository implements IOrganizationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Organization | null> {
    const record = await this.prisma.organization.findUnique({
      where: { id },
    });

    return record ? this.toDomain(record) : null;
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    const record = await this.prisma.organization.findUnique({
      where: { slug },
    });

    return record ? this.toDomain(record) : null;
  }

  async findByStripeCustomerId(customerId: string): Promise<Organization | null> {
    const record = await this.prisma.organization.findFirst({
      where: { stripeCustomerId: customerId },
    });

    return record ? this.toDomain(record) : null;
  }

  async findByPlan(plan: Plan): Promise<Organization[]> {
    const records = await this.prisma.organization.findMany({
      where: { plan },
    });

    return records.map((record) => this.toDomain(record));
  }

  async save(organization: Organization): Promise<Organization> {
    const data = organization.toObject();

    const record = await this.prisma.organization.upsert({
      where: { id: data.id },
      create: {
        id: data.id,
        name: data.name,
        slug: data.slug,
        plan: data.plan,
        stripeCustomerId: data.stripeCustomerId,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      },
      update: {
        name: data.name,
        slug: data.slug,
        plan: data.plan,
        stripeCustomerId: data.stripeCustomerId,
        updatedAt: data.updatedAt,
      },
    });

    return this.toDomain(record);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.organization.delete({
      where: { id },
    });
  }

  async existsBySlug(slug: string): Promise<boolean> {
    const count = await this.prisma.organization.count({
      where: { slug },
    });

    return count > 0;
  }

  async countByPlan(plan: Plan): Promise<number> {
    return this.prisma.organization.count({
      where: { plan },
    });
  }

  async findAll(options?: {
    skip?: number;
    take?: number;
    orderBy?: 'createdAt' | 'name';
    order?: 'asc' | 'desc';
  }): Promise<{ organizations: Organization[]; total: number }> {
    const skip = options?.skip ?? 0;
    const take = options?.take ?? 20;
    const orderBy = options?.orderBy ?? 'createdAt';
    const order = options?.order ?? 'desc';

    const [records, total] = await Promise.all([
      this.prisma.organization.findMany({
        skip,
        take,
        orderBy: { [orderBy]: order },
      }),
      this.prisma.organization.count(),
    ]);

    return {
      organizations: records.map((record) => this.toDomain(record)),
      total,
    };
  }

  private toDomain(record: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    stripeCustomerId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): Organization {
    return Organization.reconstruct({
      id: record.id,
      name: record.name,
      slug: record.slug,
      plan: record.plan as Plan,
      stripeCustomerId: record.stripeCustomerId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
