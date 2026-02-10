import { Invitation } from '../entities/Invitation';

export interface IInvitationRepository {
  findById(id: string): Promise<Invitation | null>;
  findByToken(token: string): Promise<Invitation | null>;
  findByEmail(email: string): Promise<Invitation[]>;
  findByOrganizationId(organizationId: string): Promise<Invitation[]>;
  findPendingByOrganizationId(organizationId: string): Promise<Invitation[]>;
  save(invitation: Invitation): Promise<Invitation>;
  delete(id: string): Promise<void>;
}
