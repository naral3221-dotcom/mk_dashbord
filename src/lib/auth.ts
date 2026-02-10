import { auth } from '@/infrastructure/auth/nextauth.config';
import { getPrisma } from '@/infrastructure/database/prisma';
import { PrismaUserRepository } from '@/infrastructure/repositories/PrismaUserRepository';
import { AuthService } from '@/application/services/AuthService';
import { AuthenticatedUser } from '@/application/dto/AuthDTO';

function getAuthService() {
  const prisma = getPrisma();
  const userRepo = new PrismaUserRepository(prisma);
  return new AuthService(userRepo);
}

export async function getAuthUser(): Promise<AuthenticatedUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return getAuthService().getUserById(session.user.id);
}

export async function requireAuth(): Promise<AuthenticatedUser> {
  const user = await getAuthUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}

export async function requirePermission(
  permission: keyof AuthenticatedUser['permissions'],
): Promise<AuthenticatedUser> {
  const user = await requireAuth();
  if (!user.permissions[permission]) {
    throw new Error('Forbidden');
  }
  return user;
}
