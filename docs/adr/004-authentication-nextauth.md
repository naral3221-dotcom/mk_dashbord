# ADR-004: NextAuth.js v5 for Authentication

## Status
Accepted

## Context
The Marketing Analytics SaaS platform requires authentication that supports:
- Email/password registration and login for direct users
- Google OAuth for social sign-in
- JWT-based sessions for stateless, scalable authentication
- Session data enrichment with user roles and organization context for authorization decisions
- Compatibility with Next.js App Router (both server components and API routes)

The initial project plan considered Clerk as the authentication provider. However, to maintain greater control over the authentication flow, reduce external service costs, and keep the auth layer closer to the domain (where user entities, roles, and organization membership are modeled), a self-hosted solution was preferred.

## Decision
We adopted **NextAuth.js v5** (beta) with the following configuration:

### Strategy: JWT
Sessions are stored as JWTs rather than in a database. This enables:
- Stateless session validation without database queries on every request
- Easy horizontal scaling across Vercel's serverless functions
- Session data encoded directly in the token

### Providers

1. **Credentials Provider**: Email/password authentication using `bcryptjs` for password hashing. The domain interface `IPasswordHasher` (implemented by `BcryptPasswordHasher`) decouples the hashing algorithm from the domain layer.

2. **Google OAuth Provider**: Social sign-in via Google, using `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` environment variables.

### Session Enrichment
The JWT and session callbacks extend the default NextAuth session with:
- `user.id` -- the internal user ID from the domain
- `user.role` -- the user's role within their organization (`OWNER`, `ADMIN`, `MEMBER`, `VIEWER`)
- `user.organizationId` -- the user's current organization (nullable, as users may not yet belong to an organization)

### Domain Integration
- The `User` entity in the domain layer contains `passwordHash`, `authProvider`, `emailVerified`, `image`, and `organizationId` fields.
- The `RegisterUserUseCase` handles user creation with password hashing via the `IPasswordHasher` interface.
- The `CheckPermissionUseCase` validates role-based access using the role stored in the session.

### Configuration Location
NextAuth configuration lives in `src/infrastructure/auth/nextauth.config.ts`, with the auth middleware in `src/middleware.ts`.

## Consequences

### Positive
- **Full control**: Authentication logic is fully owned, allowing custom registration flows, invitation acceptance, and organization onboarding without being constrained by a third-party service's data model.
- **Domain alignment**: The `User` entity, roles, and organization membership are modeled in the domain layer, and authentication is just an infrastructure concern that populates these domain concepts.
- **Cost effective**: No per-user authentication charges from external providers.
- **Extensible providers**: Adding new OAuth providers (GitHub, Microsoft, etc.) requires only adding a provider configuration to the NextAuth setup.
- **Middleware protection**: Next.js middleware can protect routes using the JWT session without additional API calls.

### Negative
- **NextAuth v5 beta**: At the time of adoption, NextAuth v5 was in beta. This introduced occasional breaking changes and required workarounds (e.g., `useSearchParams()` requires a Suspense boundary in client pages, session typing requires casting `(session.user as any).role`).
- **Session type extension**: NextAuth's default session types must be extended via module augmentation or type casting, which is not fully type-safe.
- **Password management**: Self-hosting credentials auth means owning password reset flows, account recovery, and breach detection, which a managed service like Clerk would provide out of the box.
- **Nullable organizationId**: The `organizationId` field on the user session is nullable (users may register before joining an organization), requiring null checks in all downstream authorization consumers.

### Neutral
- The `IPasswordHasher` domain interface ensures the bcrypt dependency stays in the infrastructure layer, maintaining Clean Architecture boundaries.
- JWT strategy means session revocation requires additional infrastructure (e.g., a token blocklist) if immediate session invalidation is needed.
- The auth configuration follows the same infrastructure-layer pattern as other external integrations (Stripe, platform API clients), keeping the project structure consistent.
