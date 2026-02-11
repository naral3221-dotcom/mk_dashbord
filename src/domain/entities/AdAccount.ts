import { Platform } from './types';
import { ValidationError } from '../errors';

export interface AdAccountProps {
  readonly id: string;
  readonly platform: Platform;
  readonly accountId: string;
  readonly accountName: string;
  readonly accessToken: string | null;
  readonly refreshToken: string | null;
  readonly tokenExpiresAt: Date | null;
  readonly isActive: boolean;
  readonly organizationId: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateAdAccountProps {
  readonly platform: Platform;
  readonly accountId: string;
  readonly accountName: string;
  readonly organizationId: string;
  readonly accessToken?: string | null;
  readonly refreshToken?: string | null;
  readonly tokenExpiresAt?: Date | null;
}

export class AdAccount {
  private constructor(private readonly props: AdAccountProps) {}

  static create(
    props: CreateAdAccountProps,
    id: string = crypto.randomUUID()
  ): AdAccount {
    if (!props.platform) {
      throw new ValidationError('Platform is required');
    }

    if (!props.accountId || props.accountId.trim().length === 0) {
      throw new ValidationError('Account ID is required');
    }

    if (!props.accountName || props.accountName.trim().length === 0) {
      throw new ValidationError('Account name is required');
    }

    if (!props.organizationId) {
      throw new ValidationError('Organization ID is required');
    }

    const now = new Date();

    return new AdAccount({
      id,
      platform: props.platform,
      accountId: props.accountId.trim(),
      accountName: props.accountName.trim(),
      accessToken: props.accessToken ?? null,
      refreshToken: props.refreshToken ?? null,
      tokenExpiresAt: props.tokenExpiresAt ?? null,
      isActive: true,
      organizationId: props.organizationId,
      createdAt: now,
      updatedAt: now,
    });
  }

  static reconstruct(props: AdAccountProps): AdAccount {
    return new AdAccount(props);
  }

  get id(): string { return this.props.id; }
  get platform(): Platform { return this.props.platform; }
  get accountId(): string { return this.props.accountId; }
  get accountName(): string { return this.props.accountName; }
  get accessToken(): string | null { return this.props.accessToken; }
  get refreshToken(): string | null { return this.props.refreshToken; }
  get tokenExpiresAt(): Date | null { return this.props.tokenExpiresAt; }
  get isActive(): boolean { return this.props.isActive; }
  get organizationId(): string { return this.props.organizationId; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }

  updateTokens(
    accessToken: string,
    refreshToken: string | null,
    expiresAt: Date
  ): AdAccount {
    if (!accessToken) {
      throw new ValidationError('Access token is required');
    }

    return new AdAccount({
      ...this.props,
      accessToken,
      refreshToken,
      tokenExpiresAt: expiresAt,
      updatedAt: new Date(),
    });
  }

  isTokenExpired(): boolean {
    if (!this.props.tokenExpiresAt) {
      return true;
    }
    return new Date() >= this.props.tokenExpiresAt;
  }

  deactivate(): AdAccount {
    return new AdAccount({
      ...this.props,
      isActive: false,
      updatedAt: new Date(),
    });
  }

  activate(): AdAccount {
    return new AdAccount({
      ...this.props,
      isActive: true,
      updatedAt: new Date(),
    });
  }

  updateAccountName(name: string): AdAccount {
    if (!name || name.trim().length === 0) {
      throw new ValidationError('Account name is required');
    }

    return new AdAccount({
      ...this.props,
      accountName: name.trim(),
      updatedAt: new Date(),
    });
  }

  toObject(): AdAccountProps {
    return { ...this.props };
  }
}
