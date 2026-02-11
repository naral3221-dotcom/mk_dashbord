# ADR-003: Platform Adapter Pattern for Multi-Platform Support

## Status
Accepted

## Context
The platform initially supported only META (Facebook/Instagram) ads. As the product roadmap required integration with Google Ads, TikTok Ads, and Naver Ads, a pattern was needed to support multiple ad platforms with vastly different APIs while keeping the domain and application layers platform-agnostic.

Key challenges included:
- **Different authentication models**: META, Google, and TikTok use OAuth 2.0, while Naver uses API Key authentication with HMAC-SHA256 signatures.
- **Different data formats**: Google Ads reports costs in micros (divide by 1,000,000), Naver uses KRW (Korean Won) as base currency, and each platform has unique campaign status enumerations.
- **Different API structures**: REST vs. GraphQL, varying pagination schemes, different rate limits.
- **Shared use cases**: Syncing campaigns and insights, refreshing tokens, and connecting accounts are conceptually identical across platforms.

## Decision
We adopted the Adapter pattern with two domain-level interfaces:

### IAdPlatformClient
A unified interface that all platform adapters must implement:

```typescript
interface IAdPlatformClient {
  readonly platform: Platform;
  readonly authType: 'oauth' | 'api_key';

  getAuthUrl(redirectUri: string, state: string): string;
  exchangeCodeForToken(code: string, redirectUri: string): Promise<TokenExchangeResult>;
  refreshAccessToken(refreshToken: string): Promise<TokenExchangeResult>;
  validateToken(accessToken: string): Promise<boolean>;
  getAdAccounts(accessToken: string): Promise<NormalizedAdAccountData[]>;
  getCampaigns(accessToken: string, externalAccountId: string): Promise<NormalizedCampaignData[]>;
  getInsights(accessToken: string, externalCampaignId: string, startDate: Date, endDate: Date): Promise<NormalizedInsightData[]>;
}
```

All data returned through this interface uses **normalized** data types (`NormalizedAdAccountData`, `NormalizedCampaignData`, `NormalizedInsightData`) that are platform-agnostic.

### IPlatformAdapterRegistry
A registry interface for looking up adapters by platform:

```typescript
interface IPlatformAdapterRegistry {
  getAdapter(platform: Platform): IAdPlatformClient;
  hasAdapter(platform: Platform): boolean;
  getSupportedPlatforms(): Platform[];
}
```

The concrete `PlatformAdapterRegistry` uses a `Map<Platform, IAdPlatformClient>` internally.

### Platform Adapter Implementations
Each platform has its own adapter in `src/infrastructure/external/`:

| Platform | Client | Adapter | Auth | Notes |
|---|---|---|---|---|
| META | `MetaApiClient` | `MetaPlatformAdapter` | OAuth 2.0 | Graph API, long-lived tokens |
| Google Ads | `GoogleAdsApiClient` | `GoogleAdsPlatformAdapter` | OAuth 2.0 | cost_micros / 1,000,000 conversion |
| TikTok Ads | `TikTokAdsApiClient` | `TikTokAdsPlatformAdapter` | OAuth 2.0 | Access-Token header (not Bearer) |
| Naver Ads | `NaverAdsApiClient` | `NaverAdsPlatformAdapter` | API Key | HMAC-SHA256 signature, KRW currency |

### Generic Use Cases
Platform-agnostic use cases (`ConnectAdAccountUseCase`, `SyncCampaignsUseCase`, `SyncInsightsUseCase`, `RefreshTokenUseCase`) accept the registry and resolve the appropriate adapter at runtime based on the `Platform` enum stored on each ad account.

## Consequences

### Positive
- **Easy platform addition**: Adding a new platform requires only implementing `IAdPlatformClient` in the infrastructure layer and registering it in the adapter registry. No domain or application code changes are needed.
- **Platform-specific logic isolation**: Each adapter handles its platform's idiosyncrasies (authentication quirks, data format normalization, currency conversion) internally, presenting a clean normalized interface to consumers.
- **Unified use cases**: A single `SyncCampaignsUseCase` handles all four platforms, eliminating duplicate business logic (e.g., `SyncMetaCampaignsUseCase` was the original META-specific version, now superseded by the generic one).
- **Testability**: Use cases can be tested with mock adapters without needing real API credentials for any platform.
- **Feature gating integration**: The `ConnectAdAccountUseCase` checks subscription plan limits (`allowedPlatforms`) before delegating to the adapter, enforcing billing constraints at the domain level.

### Negative
- **Lowest common denominator**: The normalized interface must work for all platforms, which means platform-specific features (e.g., META's ad set level, Google's campaign experiments) cannot be exposed without extending the interface.
- **Adapter complexity**: Some adapters contain significant transformation logic (e.g., Naver's HMAC-SHA256 signing, Google's micros conversion), which can make the adapter layer complex.

### Neutral
- Token encryption (`ITokenEncryption` / `AesTokenEncryption` with AES-256-GCM) is used for all platforms to securely store access tokens and refresh tokens.
- The `ICacheService` / `InMemoryCacheService` provides caching for token validation and API responses across all adapters.
- Naver Ads stores JSON credentials (`{apiKey, apiSecret, customerId}`) as a single encrypted access token, adapting the key-based auth model to the OAuth-oriented interface.
