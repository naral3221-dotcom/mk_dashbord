import { Organization } from '../entities/Organization';
import { Plan } from '../entities/types';

export interface IOrganizationRepository {
  findById(id: string): Promise<Organization | null>;
  findBySlug(slug: string): Promise<Organization | null>;
  findByStripeCustomerId(customerId: string): Promise<Organization | null>;
  findByPlan(plan: Plan): Promise<Organization[]>;
  save(organization: Organization): Promise<Organization>;
  delete(id: string): Promise<void>;
  existsBySlug(slug: string): Promise<boolean>;
  countByPlan(plan: Plan): Promise<number>;
  findAll(options?: {
    skip?: number;
    take?: number;
    orderBy?: 'createdAt' | 'name';
    order?: 'asc' | 'desc';
  }): Promise<{ organizations: Organization[]; total: number }>;
}
