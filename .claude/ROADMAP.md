# Implementation Roadmap

> **마지막 수정**: 2026-02-09
> **현재 단계**: Sprint 0 - Project Setup

---

## 📍 Overall Timeline

```
Sprint 0: Project Setup ──────────────────── Week 1
Sprint 1: Core Domain ────────────────────── Week 2
Sprint 2: Authentication & Multi-tenancy ─── Week 3
Sprint 3: META Integration ───────────────── Week 4
Sprint 4: Dashboard UI ───────────────────── Week 5-6
Sprint 5: Additional Platforms ───────────── Week 7
Sprint 6: Billing & SaaS Features ────────── Week 8
Sprint 7: Production & Polish ────────────── Week 9-10
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

## Sprint 1: Core Domain ⬅️ CURRENT

### 목표
핵심 비즈니스 엔티티 및 유스케이스 정의 (TDD)

### Tasks

| # | Task | Status | Agent | Commit |
|---|------|--------|-------|--------|
| 1.1 | Organization 엔티티 | ⬜ Todo | test-writer → implementer | |
| 1.2 | User 엔티티 | ⬜ Todo | test-writer → implementer | |
| 1.3 | AdAccount 엔티티 | ⬜ Todo | test-writer → implementer | |
| 1.4 | Campaign 엔티티 | ⬜ Todo | test-writer → implementer | |
| 1.5 | CampaignInsight 엔티티 | ⬜ Todo | test-writer → implementer | |
| 1.6 | Conversion 엔티티 | ⬜ Todo | test-writer → implementer | |
| 1.7 | Repository 인터페이스 정의 | ⬜ Todo | architect | |
| 1.8 | Prisma 스키마 구현 | ⬜ Todo | db-designer | |

### Deliverables
- [ ] Domain 레이어 완성 (테스트 포함)
- [ ] Prisma 스키마 완성
- [ ] 90%+ 테스트 커버리지

---

## Sprint 2: Authentication & Multi-tenancy

### 목표
Clerk 인증 및 멀티테넌트 구조 구현

### Tasks

| # | Task | Status | Agent | Commit |
|---|------|--------|-------|--------|
| 2.1 | Clerk 설정 및 통합 | ⬜ Todo | api-integrator | |
| 2.2 | Organization 생성 플로우 | ⬜ Todo | implementer | |
| 2.3 | 사용자 초대 기능 | ⬜ Todo | implementer | |
| 2.4 | Role 기반 접근 제어 | ⬜ Todo | implementer | |
| 2.5 | 멀티테넌트 미들웨어 | ⬜ Todo | implementer | |
| 2.6 | 보호된 라우트 설정 | ⬜ Todo | implementer | |

### Deliverables
- [ ] 로그인/회원가입 동작
- [ ] 조직 생성 및 관리
- [ ] 역할 기반 권한

---

## Sprint 3: META Integration

### 목표
META (Facebook/Instagram) 광고 API 연동

### Tasks

| # | Task | Status | Agent | Commit |
|---|------|--------|-------|--------|
| 3.1 | META OAuth 연동 | ⬜ Todo | api-integrator | |
| 3.2 | Ad Account 연결 플로우 | ⬜ Todo | implementer | |
| 3.3 | Campaign 동기화 UseCase | ⬜ Todo | test-writer → implementer | |
| 3.4 | Insights 데이터 수집 | ⬜ Todo | api-integrator | |
| 3.5 | 백그라운드 동기화 Job | ⬜ Todo | implementer | |
| 3.6 | 데이터 캐싱 전략 | ⬜ Todo | architect | |

### Deliverables
- [ ] META 계정 연결 가능
- [ ] 캠페인 데이터 자동 동기화
- [ ] 인사이트 데이터 저장

---

## Sprint 4: Dashboard UI

### 목표
핵심 대시보드 UI 구현

### Tasks

| # | Task | Status | Agent | Commit |
|---|------|--------|-------|--------|
| 4.1 | 레이아웃 (사이드바, 헤더) | ⬜ Todo | implementer | |
| 4.2 | 대시보드 홈 (KPI 카드) | ⬜ Todo | implementer | |
| 4.3 | 캠페인 목록 페이지 | ⬜ Todo | implementer | |
| 4.4 | 캠페인 상세 페이지 | ⬜ Todo | implementer | |
| 4.5 | 차트 컴포넌트 (Tremor) | ⬜ Todo | implementer | |
| 4.6 | 날짜 필터 구현 | ⬜ Todo | implementer | |
| 4.7 | 데이터 테이블 (정렬, 필터) | ⬜ Todo | implementer | |

### Deliverables
- [ ] 반응형 대시보드 UI
- [ ] 핵심 차트 및 KPI
- [ ] 필터링 기능

---

## Sprint 5: Additional Platforms

### 목표
Google Ads, TikTok, Naver 연동

### Tasks

| # | Task | Status | Agent | Commit |
|---|------|--------|-------|--------|
| 5.1 | Platform Adapter 패턴 구현 | ⬜ Todo | architect | |
| 5.2 | Google Ads 연동 | ⬜ Todo | api-integrator | |
| 5.3 | TikTok Ads 연동 | ⬜ Todo | api-integrator | |
| 5.4 | Naver 검색광고 연동 | ⬜ Todo | api-integrator | |
| 5.5 | 통합 대시보드 뷰 | ⬜ Todo | implementer | |

### Deliverables
- [ ] 멀티 플랫폼 지원
- [ ] 통합 성과 분석

---

## Sprint 6: Billing & SaaS Features

### 목표
Stripe 결제 및 SaaS 기능

### Tasks

| # | Task | Status | Agent | Commit |
|---|------|--------|-------|--------|
| 6.1 | Stripe 연동 | ⬜ Todo | api-integrator | |
| 6.2 | 구독 플랜 정의 | ⬜ Todo | architect | |
| 6.3 | 결제 플로우 | ⬜ Todo | implementer | |
| 6.4 | 플랜별 기능 제한 | ⬜ Todo | implementer | |
| 6.5 | Webhook 처리 | ⬜ Todo | implementer | |
| 6.6 | 인보이스/영수증 | ⬜ Todo | implementer | |

### Deliverables
- [ ] 구독 결제 시스템
- [ ] 플랜별 기능 분리

---

## Sprint 7: Production & Polish

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

## 📋 Changelog

### 2026-02-09
- 초기 로드맵 작성
- Sprint 0-7 정의

<!--
로드맵 수정 시 여기에 기록:
### YYYY-MM-DD
- 변경 내용
-->
