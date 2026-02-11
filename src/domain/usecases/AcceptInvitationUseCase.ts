import { User } from '../entities/User';
import { IInvitationRepository } from '../repositories/IInvitationRepository';
import { IUserRepository } from '../repositories/IUserRepository';
import { NotFoundError, ValidationError } from '../errors';

export interface AcceptInvitationInput {
  token: string;
  userId: string;  // Already registered user's ID
}

export class AcceptInvitationUseCase {
  constructor(
    private readonly invitationRepo: IInvitationRepository,
    private readonly userRepo: IUserRepository,
  ) {}

  async execute(input: AcceptInvitationInput): Promise<User> {
    // 1. Find invitation by token
    const invitation = await this.invitationRepo.findByToken(input.token);
    if (!invitation) {
      throw new NotFoundError('Invitation');
    }

    // 2. Check if expired
    if (invitation.isExpired()) {
      throw new ValidationError('Invitation has expired');
    }

    // 3. Check if already accepted
    if (invitation.acceptedAt !== null) {
      throw new ValidationError('Invitation has already been accepted');
    }

    // 4. Find the user by userId
    const user = await this.userRepo.findById(input.userId);
    if (!user) {
      throw new NotFoundError('User');
    }

    // 5. Check email matches (case-insensitive)
    const userEmail = user.email.trim().toLowerCase();
    const invitationEmail = invitation.email.trim().toLowerCase();
    if (userEmail !== invitationEmail) {
      throw new ValidationError('Email does not match invitation');
    }

    // 6. Accept invitation
    const acceptedInvitation = invitation.accept();

    // 7. Save updated invitation
    await this.invitationRepo.save(acceptedInvitation);

    // 8. Update user: joinOrganization + changeRole
    let updatedUser = user.joinOrganization(invitation.organizationId);
    updatedUser = updatedUser.changeRole(invitation.role);

    // 9. Save and return updated user
    const savedUser = await this.userRepo.save(updatedUser);
    return savedUser;
  }
}
