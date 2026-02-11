import { Organization } from '../entities/Organization';
import { User } from '../entities/User';
import { Plan, Role } from '../entities/types';
import { IOrganizationRepository } from '../repositories/IOrganizationRepository';
import { IUserRepository } from '../repositories/IUserRepository';
import { ConflictError, NotFoundError } from '../errors';

export interface CreateOrganizationInput {
  name: string;
  slug: string;
  userId: string;  // Already registered user's ID
  userName?: string;
}

export interface CreateOrganizationOutput {
  organization: Organization;
  owner: User;
}

export class CreateOrganizationUseCase {
  constructor(
    private readonly organizationRepo: IOrganizationRepository,
    private readonly userRepo: IUserRepository,
  ) {}

  async execute(input: CreateOrganizationInput): Promise<CreateOrganizationOutput> {
    // 1. Check slug uniqueness
    const slugExists = await this.organizationRepo.existsBySlug(input.slug);
    if (slugExists) {
      throw new ConflictError('Organization slug already exists', 'Organization');
    }

    // 2. Find existing user by userId
    const user = await this.userRepo.findById(input.userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    // 3. Create Organization with Plan.FREE
    const organization = Organization.create({
      name: input.name,
      slug: input.slug,
      plan: Plan.FREE,
    });

    // 4. Update user: set role to OWNER, set organizationId
    let owner = user.joinOrganization(organization.id);
    owner = owner.changeRole(Role.OWNER);

    // 5. Save organization first, then save updated user
    await this.organizationRepo.save(organization);
    await this.userRepo.save(owner);

    // 6. Return { organization, owner }
    return { organization, owner };
  }
}
