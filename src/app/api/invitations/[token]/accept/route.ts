import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/infrastructure/database/prisma';
import { PrismaInvitationRepository } from '@/infrastructure/repositories/PrismaInvitationRepository';
import { PrismaUserRepository } from '@/infrastructure/repositories/PrismaUserRepository';
import { AcceptInvitationUseCase } from '@/domain/usecases/AcceptInvitationUseCase';
import { auth } from '@/infrastructure/auth/nextauth.config';

function getAcceptUseCase() {
  const prisma = getPrisma();
  const invitationRepo = new PrismaInvitationRepository(prisma);
  const userRepo = new PrismaUserRepository(prisma);
  return new AcceptInvitationUseCase(invitationRepo, userRepo);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getAcceptUseCase().execute({
      token,
      userId: session.user.id,
    });

    return NextResponse.json({ success: true, userId: user.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
