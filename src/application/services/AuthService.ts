import { IUserRepository } from '@/domain/repositories/IUserRepository';
import { AuthenticatedUser, toAuthenticatedUser } from '../dto/AuthDTO';

export class AuthService {
  constructor(private readonly userRepo: IUserRepository) {}

  async getUserById(userId: string): Promise<AuthenticatedUser | null> {
    const user = await this.userRepo.findById(userId);
    if (!user) return null;
    return toAuthenticatedUser(user);
  }

  async getUserByEmail(email: string): Promise<AuthenticatedUser | null> {
    const user = await this.userRepo.findByEmail(email);
    if (!user) return null;
    return toAuthenticatedUser(user);
  }
}
