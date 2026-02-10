import { CreateOrganizationUseCase } from '@/domain/usecases/CreateOrganizationUseCase';
import { IOrganizationRepository } from '@/domain/repositories/IOrganizationRepository';
import { CreateOrganizationRequest, OrganizationResponse, toOrganizationResponse } from '../dto/OrganizationDTO';
import { toAuthenticatedUser, AuthenticatedUser } from '../dto/AuthDTO';

export class OrganizationService {
  constructor(
    private readonly createOrgUseCase: CreateOrganizationUseCase,
    private readonly orgRepo: IOrganizationRepository,
  ) {}

  async createOrganization(request: CreateOrganizationRequest): Promise<{ organization: OrganizationResponse; owner: AuthenticatedUser }> {
    const result = await this.createOrgUseCase.execute(request);
    return {
      organization: toOrganizationResponse(result.organization),
      owner: toAuthenticatedUser(result.owner),
    };
  }

  async getOrganization(id: string): Promise<OrganizationResponse | null> {
    const org = await this.orgRepo.findById(id);
    if (!org) return null;
    return toOrganizationResponse(org);
  }

  async getOrganizationBySlug(slug: string): Promise<OrganizationResponse | null> {
    const org = await this.orgRepo.findBySlug(slug);
    if (!org) return null;
    return toOrganizationResponse(org);
  }
}
