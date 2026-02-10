import { Role, RolePermissions, RolePermission } from '../entities/types';

export type PermissionKey = keyof RolePermission;

export class CheckPermissionUseCase {
  execute(role: Role, permission: PermissionKey): boolean {
    const permissions = RolePermissions[role];
    return permissions[permission] === true;
  }
}
