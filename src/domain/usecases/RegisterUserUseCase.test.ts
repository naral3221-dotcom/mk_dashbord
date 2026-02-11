import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RegisterUserUseCase, RegisterUserInput } from './RegisterUserUseCase';
import { User } from '../entities/User';
import { IUserRepository } from '../repositories/IUserRepository';
import { IPasswordHasher } from '../services/IPasswordHasher';
import { ConflictError } from '../errors';

describe('RegisterUserUseCase', () => {
  let useCase: RegisterUserUseCase;

  const mockUserRepo: IUserRepository = {
    findById: vi.fn(),
    findByEmail: vi.fn(),
    findByOrganizationId: vi.fn(),
    findByOrganizationAndRole: vi.fn(),
    save: vi.fn(),
    delete: vi.fn(),
    existsByEmail: vi.fn(),
    countByOrganizationId: vi.fn(),
  };

  const mockPasswordHasher: IPasswordHasher = {
    hash: vi.fn().mockResolvedValue('hashed_password'),
    compare: vi.fn(),
  };

  const validInput: RegisterUserInput = {
    email: 'test@example.com',
    password: 'Password1',
    name: 'Test User',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(null);
    vi.mocked(mockUserRepo.save).mockImplementation(async (user: User) => user);
    useCase = new RegisterUserUseCase(mockUserRepo, mockPasswordHasher);
  });

  it('should register user with valid credentials', async () => {
    const result = await useCase.execute(validInput);

    expect(result).toBeInstanceOf(User);
    expect(result.email).toBe('test@example.com');
    expect(result.name).toBe('Test User');
    expect(result.authProvider).toBe('credentials');
    expect(mockUserRepo.save).toHaveBeenCalledOnce();
  });

  it('should hash password', async () => {
    const result = await useCase.execute(validInput);

    expect(mockPasswordHasher.hash).toHaveBeenCalledWith('Password1');
    expect(result.passwordHash).toBe('hashed_password');
  });

  it('should throw if email already exists', async () => {
    const existingUser = User.reconstruct({
      id: 'existing-1',
      email: 'test@example.com',
      name: 'Existing User',
      role: 'MEMBER' as import('../entities/types').Role,
      organizationId: null,
      passwordHash: 'hashed',
      authProvider: 'credentials',
      emailVerified: null,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(mockUserRepo.findByEmail).mockResolvedValue(existingUser);

    await expect(useCase.execute(validInput)).rejects.toThrow('Email already registered');
    await expect(useCase.execute(validInput)).rejects.toBeInstanceOf(ConflictError);
  });

  it('should throw if password missing for credentials provider', async () => {
    const input: RegisterUserInput = {
      email: 'test@example.com',
      name: 'Test User',
    };

    await expect(useCase.execute(input)).rejects.toThrow('Password is required');
  });

  it('should throw if password is less than 8 characters', async () => {
    const input: RegisterUserInput = {
      ...validInput,
      password: 'Pass1',
    };

    await expect(useCase.execute(input)).rejects.toThrow('Password must be at least 8 characters');
  });

  it('should throw if password missing uppercase letter', async () => {
    const input: RegisterUserInput = {
      ...validInput,
      password: 'password1',
    };

    await expect(useCase.execute(input)).rejects.toThrow(
      'Password must contain at least one uppercase letter'
    );
  });

  it('should throw if password missing lowercase letter', async () => {
    const input: RegisterUserInput = {
      ...validInput,
      password: 'PASSWORD1',
    };

    await expect(useCase.execute(input)).rejects.toThrow(
      'Password must contain at least one lowercase letter'
    );
  });

  it('should throw if password missing number', async () => {
    const input: RegisterUserInput = {
      ...validInput,
      password: 'Passwordx',
    };

    await expect(useCase.execute(input)).rejects.toThrow(
      'Password must contain at least one number'
    );
  });

  it('should register user with google provider without password', async () => {
    const input: RegisterUserInput = {
      email: 'google@example.com',
      name: 'Google User',
      authProvider: 'google',
      image: 'https://example.com/photo.jpg',
    };

    const result = await useCase.execute(input);

    expect(result).toBeInstanceOf(User);
    expect(result.email).toBe('google@example.com');
    expect(result.authProvider).toBe('google');
    expect(result.passwordHash).toBeNull();
    expect(result.image).toBe('https://example.com/photo.jpg');
    expect(mockPasswordHasher.hash).not.toHaveBeenCalled();
  });

  it('should set emailVerified for google provider', async () => {
    const input: RegisterUserInput = {
      email: 'google@example.com',
      name: 'Google User',
      authProvider: 'google',
    };

    const result = await useCase.execute(input);

    expect(result.emailVerified).toBeInstanceOf(Date);
  });

  it('should set organizationId to null for new user', async () => {
    const result = await useCase.execute(validInput);

    expect(result.organizationId).toBeNull();
  });
});
