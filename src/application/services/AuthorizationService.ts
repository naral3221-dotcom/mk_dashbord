import { CheckPermissionUseCase, PermissionKey } from '@/domain/usecases/CheckPermissionUseCase';
import { Role } from '@/domain/entities/types';

export class AuthorizationService {
  constructor(private readonly checkPermissionUseCase: CheckPermissionUseCase) {}

  checkPermission(role: Role, permission: PermissionKey): boolean {
    return this.checkPermissionUseCase.execute(role, permission);
  }

  requirePermission(role: Role, permission: PermissionKey): void {
    if (!this.checkPermission(role, permission)) {
      throw new Error('Forbidden: insufficient permissions');
    }
  }
}
