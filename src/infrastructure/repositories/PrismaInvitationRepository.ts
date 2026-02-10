import { PrismaClient } from '@/generated/prisma';
import { Invitation } from '@/domain/entities/Invitation';
import { IInvitationRepository } from '@/domain/repositories/IInvitationRepository';
import { Role } from '@/domain/entities/types';

export class PrismaInvitationRepository implements IInvitationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Invitation | null> {
    const record = await this.prisma.invitation.findUnique({
      where: { id },
    });

    if (!record) return null;

    return this.toEntity(record);
  }

  async findByToken(token: string): Promise<Invitation | null> {
    const record = await this.prisma.invitation.findUnique({
      where: { token },
    });

    if (!record) return null;

    return this.toEntity(record);
  }

  async findByEmail(email: string): Promise<Invitation[]> {
    const records = await this.prisma.invitation.findMany({
      where: { email },
    });

    return records.map((record) => this.toEntity(record));
  }

  async findByOrganizationId(organizationId: string): Promise<Invitation[]> {
    const records = await this.prisma.invitation.findMany({
      where: { organizationId },
    });

    return records.map((record) => this.toEntity(record));
  }

  async findPendingByOrganizationId(
    organizationId: string
  ): Promise<Invitation[]> {
    const records = await this.prisma.invitation.findMany({
      where: {
        organizationId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    return records.map((record) => this.toEntity(record));
  }

  async save(invitation: Invitation): Promise<Invitation> {
    const data = invitation.toObject();

    const record = await this.prisma.invitation.upsert({
      where: { id: data.id },
      create: {
        id: data.id,
        email: data.email,
        role: data.role,
        organizationId: data.organizationId,
        invitedById: data.invitedById,
        token: data.token,
        expiresAt: data.expiresAt,
        acceptedAt: data.acceptedAt,
        createdAt: data.createdAt,
      },
      update: {
        email: data.email,
        role: data.role,
        organizationId: data.organizationId,
        invitedById: data.invitedById,
        token: data.token,
        expiresAt: data.expiresAt,
        acceptedAt: data.acceptedAt,
      },
    });

    return this.toEntity(record);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.invitation.delete({
      where: { id },
    });
  }

  private toEntity(record: {
    id: string;
    email: string;
    role: string;
    organizationId: string;
    invitedById: string;
    token: string;
    expiresAt: Date;
    acceptedAt: Date | null;
    createdAt: Date;
  }): Invitation {
    return Invitation.reconstruct({
      id: record.id,
      email: record.email,
      role: record.role as Role,
      organizationId: record.organizationId,
      invitedById: record.invitedById,
      token: record.token,
      expiresAt: record.expiresAt,
      acceptedAt: record.acceptedAt,
      createdAt: record.createdAt,
    });
  }
}
