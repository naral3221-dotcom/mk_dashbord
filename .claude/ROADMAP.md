# Implementation Roadmap

> **마지막 수정**: 2026-02-10
> **현재 단계**: Sprint 6 - Billing & SaaS ✅ 완료

---

## Overall Timeline

```
Sprint 0: Project Setup ──────────────────── ✅ Complete
Sprint 1: Core Domain ────────────────────── ✅ Complete
Sprint 2: Authentication & Multi-tenancy ─── ✅ Complete
Sprint 3: META Integration ───────────────── ✅ Complete
Sprint 4: Dashboard Visualization ─────────── ✅ Complete
Sprint 5: Additional Platforms ───────────── ✅ Complete
Sprint 6: Billing & SaaS Features ────────── ✅ Complete
Sprint 7: Production & Polish ────────────── ⬅️ Next
```

---

## Sprint 0: Project Setup ✅ COMPLETED

### 목표
프로젝트 기반 구조 완성, 개발 환경 설정

### Tasks

| # | Task | Status | Agent | Commit |
|---|------|--------|-------|--------|
| 0.1 | Next.js 14 프로젝트 초기화 | ✅ Done | - | 23b0da5 |
| 0.2 | TypeScript strict 설정 | ✅ Done | - | 23b0da5 |
| 0.3 | Clean Architecture 폴더 구조 | ✅ Done | architect | 23b0da5 |
| 0.4 | ESLint + Prettier 설정 | ✅ Done | - | 23b0da5 |
| 0.5 | TailwindCSS + shadcn/ui 설정 | ✅ Done | - | 23b0da5 |
| 0.6 | Vitest 테스트 환경 | ✅ Done | - | 23b0da5 |
| 0.7 | Prisma 초기 설정 | ✅ Done | db-designer | 23b0da5 |
| 0.8 | 환경변수 템플릿 (.env.example) | ✅ Done | - | 23b0da5 |
| 0.9 | GitHub Actions CI/CD | ✅ Done | - | 23b0da5 |

### Deliverables
- [x] 빌드 성공하는 Next.js 프로젝트
- [x] 테스트 실행 가능
- [x] CI 파이프라인 동작

---

## Sprint 1: Core Domain ✅ COMPLETED

### 목표
핵심 비즈니스 엔티티 및 유스케이스 정의 (TDD)

### Tasks

| # | Task | Status | Agent | Commit |
|---|------|--------|-------|--------|
| 1.1 | Organization 엔티티 | ✅ Done | test-writer → implementer | 2b8334b |
| 1.2 | User 엔티티 | ✅ Done | test-writer → implementer | 2b8334b |
| 1.3 | AdAccount 엔티티 | ✅ Done | test-writer → implementer | 2b8334b |
| 1.4 | Campaign 엔티티 | ✅ Done | test-writer → implementer | 2b8334b |
| 1.5 | CampaignInsight 엔티티 | ✅ Done | test-writer → implementer | 2b8334b |
| 1.6 | Conversion 엔티티 | ✅ Done | test-writer → implementer | 2b8334b |
| 1.7 | Repository 인터페이스 정의 | ✅ Done | architect | 2b8334b |
| 1.8 | Prisma 스키마 구현 | ✅ Done | db-designer | 23b0da5 |

### Deliverables
- [x] Domain 레이어 완성 (174 tests, all passing)
- [x] Prisma 스키마 완성
- [x] 100% 테스트 커버리지 (domain entities)

### Results
- **8 test files, 174 tests, ALL PASSED**
- 6 entities: Organization, User, AdAccount, Campaign, CampaignInsight, Conversion
- 6 repository interfaces
- CampaignInsight: 8 computed KPIs (CTR, CPC, CPM, CVR, CPA, ROAS, ROI, Profit)

---

## Sprint 2: Authentication & Multi-tenancy ✅ COMPLETED

### 목표
NextAuth.js v5 인증 및 멀티테넌트 구조 구현

### Tasks

| # | Task | Status | Agent | Commit |
|---|------|--------|-------|--------|
| 2.1 | NextAuth.js v5 설정 (JWT + Credentials + Google) | ✅ Done | implementer | 2ec9369 |
| 2.2 | Organization 생성 플로우 | ✅ Done | test-writer → implementer | 2ec9369 |
| 2.3 | 사용자 초대 기능 | ✅ Done | test-writer → implementer | 2ec9369 |
| 2.4 | Role 기반 접근 제어 | ✅ Done | test-writer → implementer | 2ec9369 |
| 2.5 | 멀티테넌트 미들웨어 | ✅ Done | implementer | 2ec9369 |
| 2.6 | 보호된 라우트 설정 | ✅ Done | implementer | 2ec9369 |
| 2.7 | Prisma Repository 구현체 (User, Org, Invitation) | ✅ Done | test-writer → implementer | 2ec9369 |
| 2.8 | RegisterUserUseCase (자체 회원가입) | ✅ Done | test-writer → implementer | 2ec9369 |
| 2.9 | Application Services (4개) | ✅ Done | test-writer → implementer | 2ec9369 |
| 2.10 | Full UI (Sign-in/up, Onboarding, Dashboard, Settings) | ✅ Done | implementer | 2ec9369 |

### Deliverables
- [x] 로그인/회원가입 동작 (NextAuth.js)
- [x] 조직 생성 및 관리
- [x] 역할 기반 권한
- [x] Clerk → NextAuth.js 마이그레이션 완료

### Results
- **23 test files, 322 tests, ALL PASSED**
- 6 use cases, 4 app services, 3 Prisma repositories
- 16 routes (API + pages)
- TypeScript zero errors, build successful

---

## Sprint 3: META Integration ✅ COMPLETED

### 목표
META (Facebook/Instagram) 광고 API 연동

### Tasks

| # | Task | Status | Agent | Commit |
|---|------|--------|-------|--------|
| 3.1 | META OAuth 연동 | ✅ Done | api-integrator | a8dc1bf |
| 3.2 | Ad Account 연결 플로우 | ✅ Done | test-writer → implementer | a8dc1bf |
| 3.3 | Campaign 동기화 UseCase | ✅ Done | test-writer → implementer | a8dc1bf |
| 3.4 | Insights 데이터 수집 | ✅ Done | api-integrator → implementer | a8dc1bf |
| 3.5 | 백그라운드 동기화 Job | ✅ Done | implementer | a8dc1bf |
| 3.6 | 데이터 캐싱 전략 | ✅ Done | architect → implementer | a8dc1bf |

### Deliverables
- [x] META 계정 연결 가능
- [x] 캠페인 데이터 자동 동기화
- [x] 인사이트 데이터 저장

### Results
- **469 tests total (322 Sprint 1+2 + 147 Sprint 3), ALL PASSED**
- 3 domain service interfaces: IMetaApiClient, ITokenEncryption, ICacheService
- 4 use cases: ConnectMetaAdAccount, RefreshMetaToken, SyncMetaCampaigns, SyncMetaInsights
- 2 app services: MetaAdAccountService, MetaSyncService
- 6 API routes (META auth, callback, accounts, sync campaigns, sync insights, cron)
- 3 UI components: MetaConnectButton, AdAccountList, SyncStatusCard
- 3 Prisma repositories: AdAccount, Campaign, CampaignInsight
- Infrastructure: AesTokenEncryption, InMemoryCacheService, MetaApiClient
- TypeScript zero errors, build successful

---

## Sprint 4: Dashboard Visualization ✅ COMPLETED

### 목표
동기화된 광고 성과 데이터를 대시보드에 시각화

### Tasks

| # | Task | Status | Agent | Commit |
|---|------|--------|-------|--------|
| 4.1 | GetDashboardOverview UseCase | ✅ Done | test-writer → implementer | - |
| 4.2 | GetCampaignPerformance UseCase | ✅ Done | test-writer → implementer | - |
| 4.3 | DashboardDTO + DashboardService | ✅ Done | test-writer → implementer | - |
| 4.4 | Formatters (currency/number/percent/ratio/compact/date) | ✅ Done | test-writer → implementer | - |
| 4.5 | DateRangeFilter + useDateRange Hook | ✅ Done | implementer | - |
| 4.6 | KPI Cards | ✅ Done | implementer | - |
| 4.7 | Charts (SpendTrend, CampaignComparison, SpendDistribution) | ✅ Done | implementer | - |
| 4.8 | CampaignPerformanceTable (정렬 가능) | ✅ Done | implementer | - |
| 4.9 | DashboardContent + useDashboardData Hook | ✅ Done | implementer | - |
| 4.10 | API Routes (dashboard/overview, dashboard/campaigns) | ✅ Done | implementer | - |

### Deliverables
- [x] 반응형 대시보드 UI (KPI 카드 4개 + 차트 3개 + 테이블)
- [x] 날짜 필터 (7d/30d/90d/custom)
- [x] Recharts 차트 (Line/Bar/Pie)
- [x] 클라이언트 사이드 정렬 테이블
- [x] 병렬 데이터 fetch

### Results
- **585 tests total (469 Sprint 1-3 + 116 Sprint 4), ALL PASSED**
- 2 domain use cases: GetDashboardOverview, GetCampaignPerformance
- 1 app service: DashboardService
- 1 utility: formatters (6 functions)
- 2 hooks: useDateRange, useDashboardData
- 7 UI components: KpiCard, DateRangeFilter, SpendTrendChart, CampaignComparisonChart, SpendDistributionChart, CampaignPerformanceTable, DashboardContent
- 2 API routes: dashboard/overview, dashboard/campaigns
- TypeScript zero errors, build successful

---

## Sprint 5: Additional Platforms (Multi-Platform Adapter) ✅ COMPLETED

### 목표
Platform Adapter 패턴으로 멀티 플랫폼 추상화, Google Ads/TikTok/Naver 연동

### Tasks

| # | Task | Status | Agent | Commit |
|---|------|--------|-------|--------|
| 5.1 | Platform Adapter 패턴 (IAdPlatformClient + IPlatformAdapterRegistry) | ✅ Done | architect → implementer | - |
| 5.2 | 범용 유스케이스 4개 (ConnectAdAccount, SyncCampaigns, SyncInsights, RefreshToken) | ✅ Done | test-writer → implementer | - |
| 5.3 | MetaPlatformAdapter (기존 MetaApiClient 래핑) | ✅ Done | implementer | - |
| 5.4 | Google Ads 연동 (GoogleAdsApiClient + GoogleAdsPlatformAdapter) | ✅ Done | api-integrator → implementer | - |
| 5.5 | TikTok Ads 연동 (TikTokAdsApiClient + TikTokAdsPlatformAdapter) | ✅ Done | api-integrator → implementer | - |
| 5.6 | Naver 검색광고 연동 (NaverAdsApiClient + NaverAdsPlatformAdapter) | ✅ Done | api-integrator → implementer | - |
| 5.7 | PlatformAdapterRegistry (Map-based factory) | ✅ Done | implementer | - |
| 5.8 | Dashboard 플랫폼 필터 (PlatformFilter, PlatformBadge) | ✅ Done | implementer | - |
| 5.9 | 통합 Cron, Accounts API, Integrations 페이지 | ✅ Done | implementer | - |

### Deliverables
- [x] 멀티 플랫폼 지원 (META, Google Ads, TikTok Ads, Naver Search Ads)
- [x] Platform Adapter 패턴으로 플랫폼 추가 용이
- [x] 통합 대시보드 플랫폼 필터
- [x] 30 API routes total

### Results
- **814 tests total (585 Sprint 1-4 + 229 Sprint 5), 65 test files, ALL PASSED**
- 2 domain interfaces: IAdPlatformClient, IPlatformAdapterRegistry
- 4 generalized use cases: ConnectAdAccount, SyncCampaigns, SyncInsights, RefreshToken
- 4 platform adapters: MetaPlatformAdapter, GoogleAdsPlatformAdapter, TikTokAdsPlatformAdapter, NaverAdsPlatformAdapter
- 3 new API clients: GoogleAdsApiClient, TikTokAdsApiClient, NaverAdsApiClient
- PlatformAdapterRegistry (Map-based factory)
- 2 UI components: PlatformFilter, PlatformBadge
- Unified cron, accounts API, integrations page
- New env vars: GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET, GOOGLE_ADS_DEVELOPER_TOKEN, TIKTOK_APP_ID, TIKTOK_APP_SECRET
- TypeScript zero errors, build successful

---

## Sprint 6: Billing & SaaS Features ✅ COMPLETED

### 목표
Stripe 결제 연동, 구독 플랜 관리, 플랜별 기능 제한, 빌링 UI

### Tasks

| # | Task | Status | Agent | Commit |
|---|------|--------|-------|--------|
| 6.1 | Subscription + BillingEvent 엔티티 | ✅ Done | test-writer → implementer | 9fb07ad |
| 6.2 | ISubscriptionRepo + IBillingEventRepo + IPaymentGateway 인터페이스 | ✅ Done | architect | 9fb07ad |
| 6.3 | 5 Use Cases (Checkout, Webhook, Portal, GetSub, CheckAccess) | ✅ Done | test-writer → implementer | 9fb07ad |
| 6.4 | StripePaymentGateway + PrismaRepos + stripePriceConfig | ✅ Done | api-integrator → implementer | 9fb07ad |
| 6.5 | BillingService + BillingDTO + 5 API Routes | ✅ Done | implementer | 9fb07ad |
| 6.6 | Feature Gating + Billing UI (5 components, 2 hooks, 2 pages) | ✅ Done | implementer | 9fb07ad |

### Deliverables
- [x] Stripe 결제 연동 (Checkout + Customer Portal)
- [x] 구독 플랜 관리 (FREE/STARTER/PROFESSIONAL/ENTERPRISE)
- [x] 플랜별 기능 제한 (ConnectAdAccount limits, cron FREE skip)
- [x] 빌링 UI (PricingTable, CurrentPlanBadge, UsageMeter, UpgradePrompt)
- [x] Webhook 멱등성 (BillingEvent)

### Results
- **996 tests total (814 Sprint 1-5 + 182 Sprint 6), 83 test files, ALL PASSED**
- 2 domain entities: Subscription, BillingEvent
- 2 domain repository interfaces: ISubscriptionRepository, IBillingEventRepository
- 1 domain service interface: IPaymentGateway
- 5 use cases: CreateCheckoutSession, HandleStripeWebhook, CreatePortalSession, GetSubscription, CheckFeatureAccess
- 1 app service: BillingService
- 5 API routes: billing/checkout, billing/portal, billing/subscription, billing/usage, webhooks/stripe
- 5 UI components: PricingCard, PricingTable, CurrentPlanBadge, UsageMeter, UpgradePrompt
- 2 hooks: useSubscription, usePlanLimits
- 2 pages: /pricing, /settings/billing
- Feature gating: PlanLimits extended, ConnectAdAccount limits, cron FREE skip
- TypeScript zero errors, build successful

---

## Sprint 7: Production & Polish ⬅️ NEXT

### 목표
프로덕션 배포 및 안정화

### Tasks

| # | Task | Status | Agent | Commit |
|---|------|--------|-------|--------|
| 7.1 | 에러 처리 강화 | ⬜ Todo | refactorer | |
| 7.2 | 로깅 시스템 | ⬜ Todo | implementer | |
| 7.3 | 성능 최적화 | ⬜ Todo | refactorer | |
| 7.4 | E2E 테스트 | ⬜ Todo | test-writer | |
| 7.5 | Vercel 배포 설정 | ⬜ Todo | - | |
| 7.6 | 모니터링 설정 | ⬜ Todo | - | |
| 7.7 | 문서화 | ⬜ Todo | - | |

### Deliverables
- [ ] 프로덕션 배포 완료
- [ ] 모니터링 동작
- [ ] 문서화 완료

---

## Changelog

### 2026-02-10 (Sprint 6)
- Sprint 6 완료: Billing & SaaS (996 tests, 182 new, 83 test files)
  - 2 entities: Subscription, BillingEvent
  - 5 use cases: CreateCheckoutSession, HandleStripeWebhook, CreatePortalSession, GetSubscription, CheckFeatureAccess
  - StripePaymentGateway + stripePriceConfig, PrismaSubscriptionRepository, PrismaBillingEventRepository
  - BillingService + 5 API routes (billing/checkout, portal, subscription, usage, webhooks/stripe)
  - Feature gating: PlanLimits extended, ConnectAdAccount limits, cron FREE skip
  - 5 UI components + 2 hooks + 2 pages (/pricing, /settings/billing) + sidebar billing nav
  - 35 API routes total

### 2026-02-10 (Sprint 5)
- Sprint 5 완료: Additional Platforms - Multi-Platform Adapter (814 tests, 229 new, 65 test files)
  - Platform Adapter Pattern: IAdPlatformClient + IPlatformAdapterRegistry
  - 4 generalized use cases: ConnectAdAccount, SyncCampaigns, SyncInsights, RefreshToken
  - 4 platform adapters: Meta, Google Ads, TikTok Ads, Naver Search Ads
  - 3 new API clients, PlatformAdapterRegistry, PlatformFilter/Badge UI
  - Unified cron, accounts API, integrations page, 30 API routes total

### 2026-02-10 (Sprint 1-4)
- Sprint 1 완료: 6 엔티티 + 6 Repository 인터페이스 (174 tests)
- Sprint 2 완료: Auth & Multi-tenancy (322 tests, NextAuth.js)
- Clerk → NextAuth.js 마이그레이션 완료
- Sprint 3 완료: META Integration (469 tests, 147 new)
  - 3 domain service interfaces, 4 use cases, 2 app services
  - 6 API routes, 3 UI components, META API client + token encryption + cache
- Sprint 4 완료: Dashboard Visualization (585 tests, 116 new)
  - 2 domain use cases, 1 app service, 6 formatters
  - 2 hooks, 7 UI components (Recharts), 2 API routes
  - 커맨드 문서 업데이트 루틴 추가 (/new-feature, /fix-bug, /refactor)

### 2026-02-09
- 초기 로드맵 작성
- Sprint 0-7 정의

<!--
로드맵 수정 시 여기에 기록:
### YYYY-MM-DD
- 변경 내용
-->
