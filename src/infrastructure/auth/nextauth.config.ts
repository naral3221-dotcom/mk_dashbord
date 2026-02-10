import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { getPrisma } from '@/infrastructure/database/prisma';
import { PrismaUserRepository } from '@/infrastructure/repositories/PrismaUserRepository';
import { BcryptPasswordHasher } from './BcryptPasswordHasher';
import { RegisterUserUseCase } from '@/domain/usecases/RegisterUserUseCase';

function getUserRepo() {
  return new PrismaUserRepository(getPrisma());
}

function getPasswordHasher() {
  return new BcryptPasswordHasher();
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/sign-in',
    newUser: '/onboarding',
  },
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = (credentials?.email as string)?.trim().toLowerCase();
        const password = credentials?.password as string;

        if (!email || !password) return null;

        const userRepo = getUserRepo();
        const user = await userRepo.findByEmail(email);
        if (!user) return null;

        if (!user.passwordHash) return null;

        const hasher = getPasswordHasher();
        const isValid = await hasher.compare(password, user.passwordHash);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        // For Google OAuth: auto-register or find existing user
        const userRepo = getUserRepo();
        const existingUser = await userRepo.findByEmail(user.email!);

        if (!existingUser) {
          // Register new Google user
          const hasher = getPasswordHasher();
          const registerUseCase = new RegisterUserUseCase(userRepo, hasher);
          const newUser = await registerUseCase.execute({
            email: user.email!,
            name: user.name ?? undefined,
            authProvider: 'google',
            image: user.image ?? null,
          });
          // Override the user.id to use our internal ID
          user.id = newUser.id;
        } else {
          user.id = existingUser.id;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
      }

      // Refresh user data from DB
      if (token.userId) {
        const userRepo = getUserRepo();
        const dbUser = await userRepo.findById(token.userId as string);
        if (dbUser) {
          token.role = dbUser.role;
          token.organizationId = dbUser.organizationId;
          token.email = dbUser.email;
          token.name = dbUser.name;
          token.picture = dbUser.image;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.userId as string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session.user as any).role = token.role;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session.user as any).organizationId = token.organizationId;
      }
      return session;
    },
  },
});
