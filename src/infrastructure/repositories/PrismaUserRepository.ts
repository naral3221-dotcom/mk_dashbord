import { PrismaClient } from '@/generated/prisma';
import { User } from '@/domain/entities/User';
import { Role } from '@/domain/entities/types';
import { IUserRepository } from '@/domain/repositories/IUserRepository';

export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!record) return null;

    return this.toDomain(record);
  }

  async findByEmail(email: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!record) return null;

    return this.toDomain(record);
  }

  async findByOrganizationId(organizationId: string): Promise<User[]> {
    const records = await this.prisma.user.findMany({
      where: { organizationId },
    });

    return records.map((record) => this.toDomain(record));
  }

  async findByOrganizationAndRole(
    organizationId: string,
    role: Role
  ): Promise<User[]> {
    const records = await this.prisma.user.findMany({
      where: { organizationId, role },
    });

    return records.map((record) => this.toDomain(record));
  }

  async save(user: User): Promise<User> {
    const data = user.toObject();

    const record = await this.prisma.user.upsert({
      where: { id: data.id },
      create: {
        id: data.id,
        email: data.email,
        name: data.name,
        role: data.role,
        organizationId: data.organizationId,
        passwordHash: data.passwordHash,
        authProvider: data.authProvider,
        emailVerified: data.emailVerified,
        image: data.image,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      },
      update: {
        email: data.email,
        name: data.name,
        role: data.role,
        organizationId: data.organizationId,
        passwordHash: data.passwordHash,
        authProvider: data.authProvider,
        emailVerified: data.emailVerified,
        image: data.image,
        updatedAt: data.updatedAt,
      },
    });

    return this.toDomain(record);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({
      where: { id },
    });
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: { email },
    });

    return count > 0;
  }

  async countByOrganizationId(organizationId: string): Promise<number> {
    return this.prisma.user.count({
      where: { organizationId },
    });
  }

  private toDomain(record: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    organizationId: string | null;
    passwordHash: string | null;
    authProvider: string;
    emailVerified: Date | null;
    image: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): User {
    return User.reconstruct({
      id: record.id,
      email: record.email,
      name: record.name,
      role: record.role as Role,
      organizationId: record.organizationId,
      passwordHash: record.passwordHash,
      authProvider: record.authProvider,
      emailVerified: record.emailVerified,
      image: record.image,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
