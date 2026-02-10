import { PrismaClient } from '@/generated/prisma';
import { BillingEvent } from '@/domain/entities/BillingEvent';
import { IBillingEventRepository } from '@/domain/repositories/IBillingEventRepository';

export class PrismaBillingEventRepository implements IBillingEventRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(event: BillingEvent): Promise<BillingEvent> {
    const data = event.toObject();

    const record = await this.prisma.billingEvent.create({
      data: {
        id: data.id,
        organizationId: data.organizationId,
        eventType: data.eventType,
        stripeEventId: data.stripeEventId,
        data: data.data as object,
        createdAt: data.createdAt,
      },
    });

    return this.toDomain(record);
  }

  async findByOrganizationId(
    orgId: string,
    options?: { limit?: number }
  ): Promise<BillingEvent[]> {
    const records = await this.prisma.billingEvent.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: options?.limit ?? 50,
    });

    return records.map((record) => this.toDomain(record));
  }

  async findByStripeEventId(eventId: string): Promise<BillingEvent | null> {
    const record = await this.prisma.billingEvent.findUnique({
      where: { stripeEventId: eventId },
    });

    return record ? this.toDomain(record) : null;
  }

  private toDomain(record: {
    id: string;
    organizationId: string;
    eventType: string;
    stripeEventId: string;
    data: unknown;
    createdAt: Date;
  }): BillingEvent {
    return BillingEvent.reconstruct({
      id: record.id,
      organizationId: record.organizationId,
      eventType: record.eventType,
      stripeEventId: record.stripeEventId,
      data: record.data as Record<string, unknown>,
      createdAt: record.createdAt,
    });
  }
}
