import { User } from '../entities/User';
import { Role } from '../entities/types';

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByOrganizationId(organizationId: string): Promise<User[]>;
  findByOrganizationAndRole(organizationId: string, role: Role): Promise<User[]>;
  save(user: User): Promise<User>;
  delete(id: string): Promise<void>;
  existsByEmail(email: string): Promise<boolean>;
  countByOrganizationId(organizationId: string): Promise<number>;
}
