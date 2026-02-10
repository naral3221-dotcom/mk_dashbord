import { User } from '../entities/User';
import { Role, RolePermissions } from '../entities/types';
import { IUserRepository } from '../repositories/IUserRepository';

export interface ChangeUserRoleInput {
  targetUserId: string;
  newRole: Role;
  actorUserId: string;
}

export class ChangeUserRoleUseCase {
  constructor(private readonly userRepo: IUserRepository) {}

  async execute(input: ChangeUserRoleInput): Promise<User> {
    // 1. Find actor user
    const actor = await this.userRepo.findById(input.actorUserId);
    if (!actor) {
      throw new Error('Actor not found');
    }

    // 2. Find target user
    const target = await this.userRepo.findById(input.targetUserId);
    if (!target) {
      throw new Error('Target user not found');
    }

    // 3. Check same organization
    if (actor.organizationId !== target.organizationId) {
      throw new Error('Users must be in the same organization');
    }

    // 4. Check actor has canManageUsers permission
    const actorPermissions = RolePermissions[actor.role];
    if (!actorPermissions.canManageUsers) {
      throw new Error('Insufficient permissions');
    }

    // 5. Cannot change own role
    if (input.actorUserId === input.targetUserId) {
      throw new Error('Cannot change your own role');
    }

    // 6. Cannot promote to OWNER
    if (input.newRole === Role.OWNER) {
      throw new Error('Cannot promote user to OWNER role');
    }

    // 7. If target is last OWNER, cannot demote
    if (target.role === Role.OWNER && target.organizationId) {
      const owners = await this.userRepo.findByOrganizationAndRole(
        target.organizationId,
        Role.OWNER,
      );
      if (owners.length <= 1) {
        throw new Error('Cannot demote the last owner');
      }
    }

    // 8. Change role
    const updatedUser = target.changeRole(input.newRole);

    // 9. Save and return
    return this.userRepo.save(updatedUser);
  }
}
