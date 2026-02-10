import { Role } from '@/domain/entities/types';
import type { PermissionKey } from '@/domain/usecases/CheckPermissionUseCase';
import { RolePermissions } from '@/domain/entities/types';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  name: string | null;
  role: Role;
  organizationId: string | null;
  permissions: Record<PermissionKey, boolean>;
}

export function toAuthenticatedUser(user: {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  organizationId: string | null;
}): AuthenticatedUser {
  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    organizationId: user.organizationId,
    permissions: { ...RolePermissions[user.role] },
  };
}
