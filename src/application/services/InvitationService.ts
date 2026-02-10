import { InviteUserUseCase } from '@/domain/usecases/InviteUserUseCase';
import { AcceptInvitationUseCase } from '@/domain/usecases/AcceptInvitationUseCase';
import { IInvitationRepository } from '@/domain/repositories/IInvitationRepository';
import { InviteUserRequest, AcceptInvitationRequest, InvitationResponse, toInvitationResponse } from '../dto/InvitationDTO';
import { toAuthenticatedUser, AuthenticatedUser } from '../dto/AuthDTO';

export class InvitationService {
  constructor(
    private readonly inviteUserUseCase: InviteUserUseCase,
    private readonly acceptInvitationUseCase: AcceptInvitationUseCase,
    private readonly invitationRepo: IInvitationRepository,
  ) {}

  async inviteUser(request: InviteUserRequest): Promise<InvitationResponse> {
    const invitation = await this.inviteUserUseCase.execute(request);
    return toInvitationResponse(invitation);
  }

  async acceptInvitation(request: AcceptInvitationRequest): Promise<AuthenticatedUser> {
    const user = await this.acceptInvitationUseCase.execute(request);
    return toAuthenticatedUser(user);
  }

  async listPendingInvitations(organizationId: string): Promise<InvitationResponse[]> {
    const invitations = await this.invitationRepo.findPendingByOrganizationId(organizationId);
    return invitations.map(toInvitationResponse);
  }
}
