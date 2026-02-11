# ADR-001: Use Clean Architecture

## Status
Accepted

## Context
The Marketing Analytics SaaS platform is a multi-tenant application that integrates with multiple external ad platforms (META, Google Ads, TikTok Ads, Naver Ads), handles billing via Stripe, and requires a high degree of testability and maintainability. As a long-lived SaaS product, the codebase needs to remain adaptable to changing business requirements, new platform integrations, and evolving infrastructure choices without requiring large-scale rewrites.

A clear architectural pattern was needed to enforce separation of concerns, enable test-driven development, and prevent business logic from becoming coupled to specific frameworks or external services.

## Decision
We adopted a 4-layer Clean Architecture pattern:

1. **Domain Layer** (`src/domain/`): Contains entities, repository interfaces, domain service interfaces, use cases, and error types. This layer has zero external dependencies -- it depends on nothing outside itself.

2. **Application Layer** (`src/application/`): Contains application services and DTOs that orchestrate domain use cases and adapt between the domain and infrastructure layers.

3. **Infrastructure Layer** (`src/infrastructure/`): Contains concrete implementations of domain interfaces -- Prisma repository implementations, platform API clients (META, Google, TikTok, Naver), authentication (NextAuth, bcrypt), encryption (AES-256-GCM), caching, and logging (Pino).

4. **Presentation Layer** (`src/app/`, `src/components/`, `src/hooks/`): Contains Next.js App Router pages, API routes, React components, and custom hooks.

The dependency rule is strictly enforced: inner layers never import from outer layers. Dependencies point inward:

```
Presentation -> Infrastructure -> Application -> Domain
```

## Consequences

### Positive
- **Testability**: Domain logic (entities, use cases) can be tested in complete isolation with no mocking of external services. The project achieved 1057+ tests with high coverage.
- **Platform independence**: Adding a new ad platform (e.g., Naver Ads) required only implementing the `IAdPlatformClient` interface in the infrastructure layer without touching any domain or application code.
- **Framework flexibility**: The domain layer is entirely framework-agnostic. Switching from Next.js or Prisma would not require changes to business logic.
- **Clear boundaries**: Each layer has a well-defined responsibility, making it straightforward for multiple agents/developers to work on different layers in parallel.
- **Domain error system**: Domain errors (`DomainError` subclasses with `errorCode` and `statusHint`) flow naturally from use cases through application services to API routes, where they are automatically mapped to HTTP responses.

### Negative
- **Boilerplate overhead**: Each feature requires touching multiple layers -- a domain interface, an infrastructure implementation, an application service, and a presentation route. For simple CRUD operations, this can feel excessive.
- **Learning curve**: Contributors must understand the dependency rule and layer responsibilities before making changes.
- **Indirection**: Tracing a request from the API route through the application service to the use case to the repository interface and finally to the Prisma implementation involves several files.

### Neutral
- The pattern naturally encourages the use of dependency injection, which aligns well with the TDD workflow (inject mocks in tests, real implementations in production).
- Repository interfaces are defined in the domain layer (`IUserRepository`, `IAdAccountRepository`, etc.) with Prisma implementations in the infrastructure layer, totaling 9 interface/implementation pairs.
- Domain entities use an immutable pattern with `create()` (with validation) and `reconstruct()` (without validation) factory methods.
