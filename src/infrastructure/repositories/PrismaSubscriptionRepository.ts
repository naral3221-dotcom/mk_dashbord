import { PrismaClient } from '@/generated/prisma';
import { Subscription } from '@/domain/entities/Subscription';
import { Plan, SubscriptionStatus } from '@/domain/entities/types';
import { ISubscriptionRepository } from '@/domain/repositories/ISubscriptionRepository';

export class PrismaSubscriptionRepository implements ISubscriptionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Subscription | null> {
    const record = await this.prisma.subscription.findUnique({
      where: { id },
    });

    return record ? this.toDomain(record) : null;
  }

  async findByOrganizationId(organizationId: string): Promise<Subscription | null> {
    const record = await this.prisma.subscription.findUnique({
      where: { organizationId },
    });

    return record ? this.toDomain(record) : null;
  }

  async findByStripeSubscriptionId(stripeSubId: string): Promise<Subscription | null> {
    const record = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: stripeSubId },
    });

    return record ? this.toDomain(record) : null;
  }

  async findActiveByOrganizationId(organizationId: string): Promise<Subscription | null> {
    const record = await this.prisma.subscription.findFirst({
      where: {
        organizationId,
        status: { in: ['ACTIVE', 'TRIALING'] },
      },
    });

    return record ? this.toDomain(record) : null;
  }

  async save(subscription: Subscription): Promise<Subscription> {
    const data = subscription.toObject();

    const record = await this.prisma.subscription.upsert({
      where: { id: data.id },
      create: {
        id: data.id,
        organizationId: data.organizationId,
        stripeSubscriptionId: data.stripeSubscriptionId,
        stripePriceId: data.stripePriceId,
        plan: data.plan,
        status: data.status,
        currentPeriodStart: data.currentPeriodStart,
        currentPeriodEnd: data.currentPeriodEnd,
        cancelAtPeriodEnd: data.cancelAtPeriodEnd,
        canceledAt: data.canceledAt,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      },
      update: {
        stripeSubscriptionId: data.stripeSubscriptionId,
        stripePriceId: data.stripePriceId,
        plan: data.plan,
        status: data.status,
        currentPeriodStart: data.currentPeriodStart,
        currentPeriodEnd: data.currentPeriodEnd,
        cancelAtPeriodEnd: data.cancelAtPeriodEnd,
        canceledAt: data.canceledAt,
        updatedAt: data.updatedAt,
      },
    });

    return this.toDomain(record);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.subscription.delete({
      where: { id },
    });
  }

  private toDomain(record: {
    id: string;
    organizationId: string;
    stripeSubscriptionId: string;
    stripePriceId: string;
    plan: string;
    status: string;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
    canceledAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): Subscription {
    return Subscription.reconstruct({
      id: record.id,
      organizationId: record.organizationId,
      stripeSubscriptionId: record.stripeSubscriptionId,
      stripePriceId: record.stripePriceId,
      plan: record.plan as Plan,
      status: record.status as SubscriptionStatus,
      currentPeriodStart: record.currentPeriodStart,
      currentPeriodEnd: record.currentPeriodEnd,
      cancelAtPeriodEnd: record.cancelAtPeriodEnd,
      canceledAt: record.canceledAt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
