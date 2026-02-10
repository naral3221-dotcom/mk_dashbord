# Current Context (실시간 업데이트)

> **이 파일은 세션이 끊겼을 때 컨텍스트를 복원하기 위해 사용됩니다.**
> 오케스트레이터는 중요한 상태 변화가 있을 때마다 이 파일을 업데이트합니다.

---

## Last Updated
- **날짜**: 2026-02-10
- **시간**: Sprint 4 완료
- **작업 상태**: Sprint 4 완료, Sprint 5 대기

---

## Current Sprint
**Sprint 4: Dashboard Visualization** ✅ 완료

### Sprint 0 완료 (✅)
- [x] 0.1 Next.js 14 프로젝트 초기화
- [x] 0.2 TypeScript strict 설정
- [x] 0.3 Clean Architecture 폴더 구조
- [x] 0.4 ESLint + Prettier 설정
- [x] 0.5 TailwindCSS + shadcn/ui
- [x] 0.6 Vitest 테스트 환경
- [x] 0.7 Prisma 초기 설정
- [x] 0.8 환경변수 템플릿
- [x] 0.9 GitHub Actions CI/CD

### Sprint 1 완료 (✅)
- [x] 1.1 Organization 엔티티 (33 tests)
- [x] 1.2 User 엔티티 (22 tests)
- [x] 1.3 AdAccount 엔티티 (23 tests)
- [x] 1.4 Campaign 엔티티 (25 tests)
- [x] 1.5 CampaignInsight 엔티티 (39 tests, 8 KPIs)
- [x] 1.6 Conversion 엔티티 (21 tests)
- [x] 1.7 Repository 인터페이스 정의 (6개)
- [x] 1.8 Prisma 스키마 구현

### Sprint 2 완료 (✅)
- [x] 2.1 NextAuth.js v5 설정 (JWT + Credentials + Google OAuth)
- [x] 2.2 Organization 생성 플로우 (CreateOrganizationUseCase + API + UI)
- [x] 2.3 사용자 초대 기능 (InviteUserUseCase + AcceptInvitationUseCase)
- [x] 2.4 Role 기반 접근 제어 (CheckPermissionUseCase + AuthorizationService)
- [x] 2.5 멀티테넌트 미들웨어 (NextAuth JWT middleware)
- [x] 2.6 보호된 라우트 설정 (15+ routes)
- [x] 2.7 Prisma Repository 구현체 (User, Organization, Invitation)
- [x] 2.8 RegisterUserUseCase (자체 회원가입)
- [x] 2.9 Application Services (Auth, Organization, Invitation, Authorization)
- [x] 2.10 Full UI (Sign-in/up, Onboarding, Dashboard, Settings, Invite)

### Sprint 3 완료 (✅)
- [x] 3.1 META OAuth 연동 (OAuth flow + callback)
- [x] 3.2 Ad Account 연결 플로우 (ConnectMetaAdAccountUseCase)
- [x] 3.3 Campaign 동기화 UseCase (SyncMetaCampaignsUseCase)
- [x] 3.4 Insights 데이터 수집 (SyncMetaInsightsUseCase)
- [x] 3.5 백그라운드 동기화 Job (cron/sync-meta route)
- [x] 3.6 데이터 캐싱 전략 (InMemoryCacheService)

### Sprint 4 완료 (✅)
- [x] 4.1 GetDashboardOverview UseCase (14 tests, KPI 집계 + 일별 추이 + 캠페인별 지출)
- [x] 4.2 GetCampaignPerformance UseCase (10 tests, 캠페인별 성과 집계)
- [x] 4.3 DashboardDTO + DashboardService (8 tests)
- [x] 4.4 Formatters (15 tests: currency, number, percent, ratio, compact, date)
- [x] 4.5 DateRangeFilter + useDateRange Hook (21 tests: 7d/30d/90d/custom)
- [x] 4.6 KPI Cards (9 tests: 5개 포맷 지원)
- [x] 4.7 Charts - SpendTrend/CampaignComparison/SpendDistribution (13 tests, Recharts)
- [x] 4.8 CampaignPerformanceTable (10 tests, 클라이언트 정렬)
- [x] 4.9 DashboardContent + useDashboardData (16 tests, 병렬 fetch)
- [x] 4.10 API Routes - dashboard/overview, dashboard/campaigns (lazy init)

### Sprint 5 대기 중
- [ ] 5.1 Platform Adapter 패턴 구현
- [ ] 5.2 Google Ads 연동
- [ ] 5.3 TikTok Ads 연동
- [ ] 5.4 Naver 검색광고 연동
- [ ] 5.5 통합 대시보드 뷰

---

## Key Files (참조용)
```
dashboard/
├── CLAUDE.md                    # 메인 가이드라인
├── .claude/
│   ├── CONTEXT.md               # 현재 파일 (컨텍스트)
│   ├── STATUS.md                # 전체 진행 상황
│   ├── ROADMAP.md               # 로드맵
│   ├── ORCHESTRATOR.md          # 오케스트레이터 가이드
│   ├── PROMPT_GUIDE.md          # 프롬프트 가이드
│   └── logs/                    # 작업 로그
├── src/
│   ├── domain/                  # 6 entities, 7 repos, 12 use cases, 4 service interfaces
│   ├── application/             # 7 services, 5 DTOs
│   ├── infrastructure/          # 6 Prisma repos, NextAuth, META client, encryption, cache
│   ├── lib/                     # formatters
│   ├── hooks/                   # useDateRange, useDashboardData
│   ├── components/dashboard/    # KpiCard, DateRangeFilter, Charts(3), Table, DashboardContent
│   └── app/                     # 24+ routes (Sprint 2 + META + Dashboard), UI components
```

---

## Important Decisions Made
1. **기술 스택**: Next.js 14 + TypeScript + PostgreSQL + Prisma + NextAuth.js + Stripe
2. **아키텍처**: Clean Architecture (domain/application/infrastructure/presentation)
3. **개발 방법론**: TDD (Red-Green-Refactor)
4. **인증**: NextAuth.js v5 (Clerk에서 마이그레이션 - 비용 절감)
5. **세션 전략**: JWT (DB 세션 불필요, token에 userId/role/orgId 포함)
6. **Prisma Adapter 미사용**: 기존 Repository 패턴 유지 (Clean Architecture)
7. **organizationId nullable**: 회원가입 → 온보딩(조직 생성) 플로우 지원
8. **Chart Library**: Recharts (경량, React 19 호환, Tremor 대신 선택)
9. **Prisma v7 lazy init**: API route에서 `require()` 패턴 사용 (빌드 시 PrismaClient 초기화 방지)

---

## Session Handoff Notes
새 세션 시작 시 읽어야 할 파일 순서:
1. `CLAUDE.md` - 프로젝트 규칙 확인
2. `.claude/CONTEXT.md` - 현재 상태 확인 (이 파일)
3. `.claude/STATUS.md` - 전체 진행 상황
4. `.claude/ROADMAP.md` - 로드맵 확인
5. `.claude/logs/YYYY-MM-DD.md` - 최근 작업 로그 확인

---

## Active Blockers
```
없음
```

---

## Pending User Decisions
```
없음 - Sprint 5 시작 대기 중
```
