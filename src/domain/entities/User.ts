import { Role } from './types';

export interface UserProps {
  readonly id: string;
  readonly email: string;
  readonly name: string | null;
  readonly role: Role;
  readonly organizationId: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateUserProps {
  readonly email: string;
  readonly name?: string | null;
  readonly role?: Role;
  readonly organizationId: string;
}

export class User {
  private constructor(private readonly props: UserProps) {}

  static create(
    props: CreateUserProps,
    id: string = crypto.randomUUID()
  ): User {
    const trimmedEmail = props.email?.trim() ?? '';
    if (!trimmedEmail || !User.isValidEmail(trimmedEmail)) {
      throw new Error('Invalid email format');
    }

    if (!props.organizationId) {
      throw new Error('Organization ID is required');
    }

    if (props.name && props.name.length > 100) {
      throw new Error('Name must be less than 100 characters');
    }

    const now = new Date();

    return new User({
      id,
      email: props.email.toLowerCase().trim(),
      name: props.name?.trim() ?? null,
      role: props.role ?? Role.MEMBER,
      organizationId: props.organizationId,
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstruct(props: UserProps): User {
    return new User(props);
  }

  get id(): string {
    return this.props.id;
  }

  get email(): string {
    return this.props.email;
  }

  get name(): string | null {
    return this.props.name;
  }

  get role(): Role {
    return this.props.role;
  }

  get organizationId(): string {
    return this.props.organizationId;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  updateName(name: string | null): User {
    if (name && name.length > 100) {
      throw new Error('Name must be less than 100 characters');
    }

    return new User({
      ...this.props,
      name: name?.trim() ?? null,
      updatedAt: new Date(),
    });
  }

  changeRole(newRole: Role): User {
    if (this.props.role === newRole) {
      return this;
    }

    return new User({
      ...this.props,
      role: newRole,
      updatedAt: new Date(),
    });
  }

  toObject(): UserProps {
    return { ...this.props };
  }

  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
