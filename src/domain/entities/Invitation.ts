import { Role } from './types';

export interface InvitationProps {
  readonly id: string;
  readonly email: string;
  readonly role: Role;
  readonly organizationId: string;
  readonly invitedById: string;
  readonly token: string;
  readonly expiresAt: Date;
  readonly acceptedAt: Date | null;
  readonly createdAt: Date;
}

export interface CreateInvitationProps {
  readonly email: string;
  readonly role?: Role;
  readonly organizationId: string;
  readonly invitedById: string;
  readonly token: string;
  readonly expiresAt: Date;
}

export class Invitation {
  private constructor(private readonly props: InvitationProps) {}

  static create(
    props: CreateInvitationProps,
    id: string = crypto.randomUUID()
  ): Invitation {
    const trimmedEmail = props.email?.trim() ?? '';
    if (!trimmedEmail || !Invitation.isValidEmail(trimmedEmail)) {
      throw new Error('Invalid email format');
    }

    if (!props.organizationId) {
      throw new Error('Organization ID is required');
    }

    if (!props.invitedById) {
      throw new Error('Inviter ID is required');
    }

    const trimmedToken = props.token?.trim() ?? '';
    if (!trimmedToken) {
      throw new Error('Token is required');
    }

    if (props.expiresAt.getTime() <= Date.now()) {
      throw new Error('Expiration date must be in the future');
    }

    const now = new Date();

    return new Invitation({
      id,
      email: trimmedEmail.toLowerCase(),
      role: props.role ?? Role.MEMBER,
      organizationId: props.organizationId,
      invitedById: props.invitedById,
      token: trimmedToken,
      expiresAt: props.expiresAt,
      acceptedAt: null,
      createdAt: now,
    });
  }

  static reconstruct(props: InvitationProps): Invitation {
    return new Invitation(props);
  }

  get id(): string {
    return this.props.id;
  }

  get email(): string {
    return this.props.email;
  }

  get role(): Role {
    return this.props.role;
  }

  get organizationId(): string {
    return this.props.organizationId;
  }

  get invitedById(): string {
    return this.props.invitedById;
  }

  get token(): string {
    return this.props.token;
  }

  get expiresAt(): Date {
    return this.props.expiresAt;
  }

  get acceptedAt(): Date | null {
    return this.props.acceptedAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  accept(): Invitation {
    if (this.props.acceptedAt) {
      throw new Error('Invitation has already been accepted');
    }

    if (this.isExpired()) {
      throw new Error('Invitation has expired');
    }

    return new Invitation({
      ...this.props,
      acceptedAt: new Date(),
    });
  }

  isExpired(): boolean {
    return this.props.expiresAt.getTime() < Date.now();
  }

  isPending(): boolean {
    return !this.props.acceptedAt && !this.isExpired();
  }

  toObject(): InvitationProps {
    return { ...this.props };
  }

  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
