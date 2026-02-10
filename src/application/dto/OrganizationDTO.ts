import { Plan } from '@/domain/entities/types';

export interface CreateOrganizationRequest {
  name: string;
  slug: string;
  userId: string;
  userName?: string;
}

export interface OrganizationResponse {
  id: string;
  name: string;
  slug: string;
  plan: Plan;
  createdAt: Date;
}

export function toOrganizationResponse(org: {
  id: string;
  name: string;
  slug: string;
  plan: Plan;
  createdAt: Date;
}): OrganizationResponse {
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    plan: org.plan,
    createdAt: org.createdAt,
  };
}
