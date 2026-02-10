import { User } from '../entities/User';
import { IUserRepository } from '../repositories/IUserRepository';
import { IPasswordHasher } from '../services/IPasswordHasher';

export interface RegisterUserInput {
  email: string;
  password?: string;
  name?: string;
  authProvider?: string;  // 'credentials' | 'google'
  image?: string | null;
}

export class RegisterUserUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly passwordHasher: IPasswordHasher,
  ) {}

  async execute(input: RegisterUserInput): Promise<User> {
    const email = input.email.trim().toLowerCase();

    // 1. Check if email already exists
    const existingUser = await this.userRepo.findByEmail(email);
    if (existingUser) {
      throw new Error('Email already registered');
    }

    const authProvider = input.authProvider ?? 'credentials';

    // 2. For credentials provider, password is required
    let passwordHash: string | null = null;
    if (authProvider === 'credentials') {
      if (!input.password) {
        throw new Error('Password is required');
      }
      if (input.password.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }
      if (!/[A-Z]/.test(input.password)) {
        throw new Error('Password must contain at least one uppercase letter');
      }
      if (!/[a-z]/.test(input.password)) {
        throw new Error('Password must contain at least one lowercase letter');
      }
      if (!/[0-9]/.test(input.password)) {
        throw new Error('Password must contain at least one number');
      }
      passwordHash = await this.passwordHasher.hash(input.password);
    }

    // 3. Create user (no organization yet)
    const user = User.create({
      email,
      name: input.name,
      passwordHash,
      authProvider,
      emailVerified: authProvider === 'google' ? new Date() : null,
      image: input.image ?? null,
    });

    // 4. Save and return
    return this.userRepo.save(user);
  }
}
