import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/infrastructure/database/prisma';
import { PrismaOrganizationRepository } from '@/infrastructure/repositories/PrismaOrganizationRepository';
import { PrismaUserRepository } from '@/infrastructure/repositories/PrismaUserRepository';
import { CreateOrganizationUseCase } from '@/domain/usecases/CreateOrganizationUseCase';
import { OrganizationService } from '@/application/services/OrganizationService';
import { auth } from '@/infrastructure/auth/nextauth.config';

function getOrgService() {
  const prisma = getPrisma();
  const orgRepo = new PrismaOrganizationRepository(prisma);
  const userRepo = new PrismaUserRepository(prisma);
  const createOrgUseCase = new CreateOrganizationUseCase(orgRepo, userRepo);
  return new OrganizationService(createOrgUseCase, orgRepo);
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    const result = await getOrgService().createOrganization({
      name: body.name,
      slug: body.slug,
      userId: session.user.id,
      userName: session.user.name ?? undefined,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
