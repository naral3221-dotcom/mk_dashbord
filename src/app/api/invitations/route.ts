import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/infrastructure/database/prisma';
import { PrismaInvitationRepository } from '@/infrastructure/repositories/PrismaInvitationRepository';
import { PrismaUserRepository } from '@/infrastructure/repositories/PrismaUserRepository';
import { PrismaOrganizationRepository } from '@/infrastructure/repositories/PrismaOrganizationRepository';
import { InviteUserUseCase } from '@/domain/usecases/InviteUserUseCase';
import { AcceptInvitationUseCase } from '@/domain/usecases/AcceptInvitationUseCase';
import { InvitationService } from '@/application/services/InvitationService';
import { requireAuth } from '@/lib/auth';
import { Role } from '@/domain/entities/types';
import { handleApiError } from '@/lib/apiErrorHandler';

function getInvitationService() {
  const prisma = getPrisma();
  const invitationRepo = new PrismaInvitationRepository(prisma);
  const userRepo = new PrismaUserRepository(prisma);
  const orgRepo = new PrismaOrganizationRepository(prisma);
  const inviteUseCase = new InviteUserUseCase(invitationRepo, userRepo, orgRepo);
  const acceptUseCase = new AcceptInvitationUseCase(invitationRepo, userRepo);
  return new InvitationService(inviteUseCase, acceptUseCase, invitationRepo);
}

export async function GET() {
  try {
    const user = await requireAuth();
    if (!user.organizationId) {
      return NextResponse.json({ error: 'No organization' }, { status: 400 });
    }
    const invitations = await getInvitationService().listPendingInvitations(user.organizationId);
    return NextResponse.json(invitations);
  } catch (error) {
    const { body, status } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    if (!user.organizationId) {
      return NextResponse.json({ error: 'No organization' }, { status: 400 });
    }
    const body = await req.json();

    const result = await getInvitationService().inviteUser({
      email: body.email,
      role: body.role as Role,
      organizationId: user.organizationId,
      invitedById: user.userId,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const { body, status } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
