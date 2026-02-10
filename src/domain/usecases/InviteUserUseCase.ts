import { Invitation } from '../entities/Invitation';
import { Role, RolePermissions, PlanLimits } from '../entities/types';
import { IInvitationRepository } from '../repositories/IInvitationRepository';
import { IUserRepository } from '../repositories/IUserRepository';
import { IOrganizationRepository } from '../repositories/IOrganizationRepository';

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
      throw new Error('Inviter not found');
    }

    // 2. Check actor has canManageUsers permission
    const permissions = RolePermissions[actor.role];
    if (!permissions.canManageUsers) {
      throw new Error('Insufficient permissions');
    }

    // 3. Cannot invite as OWNER role
    if (input.role === Role.OWNER) {
      throw new Error('Cannot invite user as OWNER');
    }

    // 4. Find organization
    const organization = await this.organizationRepo.findById(input.organizationId);
    if (!organization) {
      throw new Error('Organization not found');
    }

    // 5. Check PlanLimits: count current users + pending invitations
    const planLimit = PlanLimits[organization.plan];
    if (planLimit.maxUsers !== -1) {
      const userCount = await this.userRepo.countByOrganizationId(input.organizationId);
      const pendingInvitations = await this.invitationRepo.findPendingByOrganizationId(input.organizationId);
      const currentCount = userCount + pendingInvitations.length;

      if (currentCount >= planLimit.maxUsers) {
        throw new Error('User limit reached for current plan');
      }
    }

    // 6. Check email not already a member of the same organization
    const existingUser = await this.userRepo.findByEmail(input.email);
    if (existingUser && existingUser.organizationId === input.organizationId) {
      throw new Error('User already exists in this organization');
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
