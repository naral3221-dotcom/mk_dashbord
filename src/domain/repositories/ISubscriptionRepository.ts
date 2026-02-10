import { Subscription } from '../entities/Subscription';

export interface ISubscriptionRepository {
  findById(id: string): Promise<Subscription | null>;
  findByOrganizationId(organizationId: string): Promise<Subscription | null>;
  findByStripeSubscriptionId(stripeSubId: string): Promise<Subscription | null>;
  findActiveByOrganizationId(organizationId: string): Promise<Subscription | null>;
  save(subscription: Subscription): Promise<Subscription>;
  delete(id: string): Promise<void>;
}
