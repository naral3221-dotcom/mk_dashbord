# ADR-002: Structured Domain Error System

## Status
Accepted

## Context
Early in development, error handling in API routes relied on string-based error matching (e.g., checking `error.message` for specific substrings) to determine appropriate HTTP status codes. This approach was fragile, prone to breakage when error messages changed, and made it difficult to ensure consistent API error responses across all endpoints.

As the number of use cases grew (21 at the time of this decision), the need for a systematic, type-safe error handling mechanism became critical. Different domain operations produce different categories of errors (validation failures, not found, authorization issues, external service failures, plan limit violations), each of which should map to specific HTTP status codes.

## Decision
We introduced an abstract `DomainError` base class with two key properties:

```typescript
export abstract class DomainError extends Error {
  abstract readonly errorCode: string;   // Machine-readable error code
  abstract readonly statusHint: number;  // Suggested HTTP status code
}
```

Seven concrete error subclasses were created:

| Error Class | errorCode | statusHint | Usage |
|---|---|---|---|
| `ValidationError` | `VALIDATION_ERROR` | 400 | Invalid input data, malformed requests |
| `NotFoundError` | `NOT_FOUND` | 404 | Entity not found in repository |
| `UnauthorizedError` | `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `ForbiddenError` | `FORBIDDEN` | 403 | Insufficient permissions for operation |
| `ConflictError` | `CONFLICT` | 409 | Duplicate entities, state conflicts |
| `ExternalServiceError` | `EXTERNAL_SERVICE_ERROR` | 502 | Platform API failures (META, Google, etc.) |
| `PlanLimitError` | `PLAN_LIMIT_EXCEEDED` | 403 | Subscription plan limit reached |

A centralized `handleApiError()` function in `src/lib/apiErrorHandler.ts` handles all errors from API routes:

- If the error is a `DomainError` instance, it extracts `errorCode`, `message`, and `statusHint` to produce a structured JSON response.
- If the error is unknown/unexpected, it logs via Pino, reports to Sentry, and returns a generic 500 response with `INTERNAL_ERROR` error code.

## Consequences

### Positive
- **Type safety**: API routes use `instanceof DomainError` checks rather than fragile string matching, catching errors at compile time when error classes change.
- **Consistent API responses**: Every error response follows the same `{ error: string, errorCode: string }` format with the appropriate HTTP status code.
- **Centralized handling**: A single `handleApiError()` function used across all 14+ API route groups eliminates duplication and ensures uniform behavior.
- **Observability**: Unexpected errors are automatically logged with structured context and reported to Sentry, while expected domain errors produce clean responses without noise.
- **Extensibility**: Adding a new error type (e.g., `PlanLimitError` in Sprint 6) requires only creating a new subclass with the appropriate `errorCode` and `statusHint`.

### Negative
- **Domain awareness of HTTP**: The `statusHint` property introduces a slight coupling between the domain layer and HTTP semantics. While it is only a "hint" and the presentation layer could override it, the property name implies HTTP awareness in the domain.

### Neutral
- Error codes are uppercase, underscore-separated strings (e.g., `VALIDATION_ERROR`) suitable for both machine parsing and human readability.
- The `Object.setPrototypeOf(this, new.target.prototype)` call in `DomainError` ensures correct `instanceof` behavior across TypeScript class hierarchies.
