import 'next-auth';
import { Role } from '@/domain/entities/types';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string | null;
      image?: string | null;
      role: Role;
      organizationId: string | null;
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId: string;
    role: string;
    organizationId: string | null;
  }
}
