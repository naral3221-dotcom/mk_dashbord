import { BillingEvent } from '../entities/BillingEvent';

export interface IBillingEventRepository {
  save(event: BillingEvent): Promise<BillingEvent>;
  findByOrganizationId(orgId: string, options?: { limit?: number }): Promise<BillingEvent[]>;
  findByStripeEventId(eventId: string): Promise<BillingEvent | null>;
}
