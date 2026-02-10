import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/infrastructure/database/prisma';
import { PrismaUserRepository } from '@/infrastructure/repositories/PrismaUserRepository';
import { requireAuth } from '@/lib/auth';

function getUserRepo() {
  return new PrismaUserRepository(getPrisma());
}

export async function GET(req: NextRequest) {
  try {
    const currentUser = await requireAuth();
    if (!currentUser.organizationId) {
      return NextResponse.json({ error: 'No organization' }, { status: 400 });
    }
    const users = await getUserRepo().findByOrganizationId(currentUser.organizationId);

    return NextResponse.json(
      users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
      })),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message === 'Unauthorized' ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
