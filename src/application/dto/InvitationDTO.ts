import { Role } from '@/domain/entities/types';

export interface InviteUserRequest {
  email: string;
  role: Role;
  organizationId: string;
  invitedById: string;
}

export interface AcceptInvitationRequest {
  token: string;
  userId: string;
}

export interface InvitationResponse {
  id: string;
  email: string;
  role: Role;
  organizationId: string;
  token: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  createdAt: Date;
  isPending: boolean;
}

export function toInvitationResponse(invitation: {
  id: string;
  email: string;
  role: Role;
  organizationId: string;
  token: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  createdAt: Date;
  isPending(): boolean;
}): InvitationResponse {
  return {
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    organizationId: invitation.organizationId,
    token: invitation.token,
    expiresAt: invitation.expiresAt,
    acceptedAt: invitation.acceptedAt,
    createdAt: invitation.createdAt,
    isPending: invitation.isPending(),
  };
}
