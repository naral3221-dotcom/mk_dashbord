import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/infrastructure/database/prisma';
import { PrismaUserRepository } from '@/infrastructure/repositories/PrismaUserRepository';
import { BcryptPasswordHasher } from '@/infrastructure/auth/BcryptPasswordHasher';
import { RegisterUserUseCase } from '@/domain/usecases/RegisterUserUseCase';
import { handleApiError } from '@/lib/apiErrorHandler';

function getRegisterUseCase() {
  const prisma = getPrisma();
  const userRepo = new PrismaUserRepository(prisma);
  const passwordHasher = new BcryptPasswordHasher();
  return new RegisterUserUseCase(userRepo, passwordHasher);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, name } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 },
      );
    }

    const user = await getRegisterUseCase().execute({
      email,
      password,
      name,
      authProvider: 'credentials',
    });

    return NextResponse.json(
      { id: user.id, email: user.email, name: user.name },
      { status: 201 },
    );
  } catch (error) {
    const { body, status } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
