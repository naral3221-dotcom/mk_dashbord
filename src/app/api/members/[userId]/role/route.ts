import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/infrastructure/database/prisma';
import { PrismaUserRepository } from '@/infrastructure/repositories/PrismaUserRepository';
import { ChangeUserRoleUseCase } from '@/domain/usecases/ChangeUserRoleUseCase';
import { requireAuth } from '@/lib/auth';
import { Role } from '@/domain/entities/types';

function getChangeRoleUseCase() {
  const prisma = getPrisma();
  const userRepo = new PrismaUserRepository(prisma);
  return new ChangeUserRoleUseCase(userRepo);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId: targetUserId } = await params;
    const currentUser = await requireAuth();
    const body = await req.json();

    const updatedUser = await getChangeRoleUseCase().execute({
      targetUserId,
      newRole: body.role as Role,
      actorUserId: currentUser.userId,
    });

    return NextResponse.json({
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message === 'Unauthorized' ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
