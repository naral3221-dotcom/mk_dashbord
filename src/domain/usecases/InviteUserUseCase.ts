import { Invitation } from '../entities/Invitation';
import { Role, RolePermissions, PlanLimits } from '../entities/types';
import { IInvitationRepository } from '../repositories/IInvitationRepository';
import { IUserRepository } from '../repositories/IUserRepository';
import { IOrganizationRepository } from '../repositories/IOrganizationRepository';
import { NotFoundError, ForbiddenError, PlanLimitError, ConflictError } from '../errors';

export interface InviteUserInput {
  email: string;
  role: Role;
  organizationId: string;
  invitedById: string;
}

export class InviteUserUseCase {
  constructor(
    private readonly invitationRepo: IInvitationRepository,
    private readonly userRepo: IUserRepository,
    private readonly organizationRepo: IOrganizationRepository,
  ) {}

  async execute(input: InviteUserInput): Promise<Invitation> {
    // 1. Find the actor (invitedBy) user
    const actor = await this.userRepo.findById(input.invitedById);
    if (!actor) {
      throw new NotFoundError('User');
    }

    // 2. Check actor has canManageUsers permission
    const permissions = RolePermissions[actor.role];
    if (!permissions.canManageUsers) {
      throw new ForbiddenError('Insufficient permissions');
    }

    // 3. Cannot invite as OWNER role
    if (input.role === Role.OWNER) {
      throw new ForbiddenError('Cannot invite user as OWNER');
    }

    // 4. Find organization
    const organization = await this.organizationRepo.findById(input.organizationId);
    if (!organization) {
      throw new NotFoundError('Organization');
    }

    // 5. Check PlanLimits: count current users + pending invitations
    const planLimit = PlanLimits[organization.plan];
    if (planLimit.maxUsers !== -1) {
      const userCount = await this.userRepo.countByOrganizationId(input.organizationId);
      const pendingInvitations = await this.invitationRepo.findPendingByOrganizationId(input.organizationId);
      const currentCount = userCount + pendingInvitations.length;

      if (currentCount >= planLimit.maxUsers) {
        throw new PlanLimitError('User limit reached for current plan', 'users');
      }
    }

    // 6. Check email not already a member of the same organization
    const existingUser = await this.userRepo.findByEmail(input.email);
    if (existingUser && existingUser.organizationId === input.organizationId) {
      throw new ConflictError('User already exists in this organization', 'User');
    }

    // 7. Generate token
    const token = crypto.randomUUID();

    // 8. Create Invitation with 7 days expiry
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const invitation = Invitation.create({
      email: input.email,
      role: input.role,
      organizationId: input.organizationId,
      invitedById: input.invitedById,
      token,
      expiresAt: sevenDaysFromNow,
    });

    // 9. Save and return invitation
    return this.invitationRepo.save(invitation);
  }
}
