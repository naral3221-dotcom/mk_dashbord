'use client';

import { signOut, useSession } from 'next-auth/react';

interface HeaderProps {
  organizationName?: string;
}

export function Header({ organizationName }: HeaderProps) {
  const { data: session } = useSession();

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      <div>
        {organizationName && (
          <span className="text-sm font-medium text-gray-600">{organizationName}</span>
        )}
      </div>
      <div className="flex items-center gap-4">
        {session?.user && (
          <>
            <span className="text-sm text-gray-600">
              {session.user.name ?? session.user.email}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: '/sign-in' })}
              className="rounded-md bg-gray-100 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-200"
            >
              Sign out
            </button>
          </>
        )}
      </div>
    </header>
  );
}
