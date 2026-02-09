# Marketing Analytics SaaS - Project Guidelines

## Project Overview
마케팅 애널리틱스 SaaS 플랫폼 개발 프로젝트
- **목표**: 멀티테넌트 광고 성과 분석 대시보드
- **기술 스택**: Next.js 14, TypeScript, PostgreSQL, Prisma, Clerk, Stripe
- **아키텍처**: Clean Architecture + TDD

---

## 🎯 Work Principles

### 1. Orchestrator Pattern
- **Main Agent (Opus)**: 오케스트레이터 역할, 직접 코딩 최소화
- **Sub-Agents**: 실제 구현 담당, 각 도메인별 전문화
- 모든 작업은 Task 분해 → Sub-Agent 위임 → 결과 검증 순서

### 2. TDD (Test-Driven Development)
```
1. RED: 실패하는 테스트 먼저 작성
2. GREEN: 테스트를 통과하는 최소 코드 작성
3. REFACTOR: 코드 개선 (테스트는 계속 통과)
```
- 테스트 없는 코드는 머지 불가
- 커버리지 목표: 80% 이상
- 테스트 파일: `*.test.ts` 또는 `*.spec.ts`

### 3. Clean Architecture Layers
```
src/
├── domain/           # 핵심 비즈니스 로직 (의존성 없음)
│   ├── entities/     # 엔티티 정의
│   ├── repositories/ # 리포지토리 인터페이스
│   └── usecases/     # 유스케이스 (비즈니스 규칙)
│
├── infrastructure/   # 외부 시스템 연동
│   ├── database/     # Prisma, DB 구현체
│   ├── external/     # META API, Stripe 등
│   └── repositories/ # 리포지토리 구현체
│
├── application/      # 애플리케이션 서비스
│   ├── services/     # 애플리케이션 로직
│   └── dto/          # Data Transfer Objects
│
└── presentation/     # UI Layer (Next.js)
    ├── app/          # App Router
    ├── components/   # React 컴포넌트
    └── hooks/        # Custom Hooks
```

**의존성 규칙**:
- `domain` ← `application` ← `infrastructure` ← `presentation`
- 안쪽 레이어는 바깥쪽을 알지 못함

---

## 🤖 Sub-Agent Definitions

### Agent: architect
**역할**: 아키텍처 설계 및 검토
**사용 시점**: 새로운 기능 설계, 구조 변경 시
**프롬프트 템플릿**:
```
You are the Architecture Agent for Marketing Analytics SaaS.
Follow Clean Architecture principles strictly.
Task: [TASK_DESCRIPTION]
Output: Design document with folder structure, interfaces, and data flow.
```

### Agent: test-writer
**역할**: 테스트 코드 작성 (TDD의 RED 단계)
**사용 시점**: 새로운 기능 구현 전
**프롬프트 템플릿**:
```
You are the Test Writer Agent. Write failing tests FIRST.
Follow TDD principles. Use Vitest for unit tests, Playwright for E2E.
Task: [FEATURE_DESCRIPTION]
Output: Test files that define expected behavior (should fail initially).
```

### Agent: implementer
**역할**: 테스트를 통과하는 코드 구현 (TDD의 GREEN 단계)
**사용 시점**: 테스트 작성 후
**프롬프트 템플릿**:
```
You are the Implementer Agent. Write minimal code to pass tests.
Do NOT over-engineer. Follow existing patterns in codebase.
Task: [IMPLEMENTATION_TASK]
Tests to pass: [TEST_FILE_PATHS]
Output: Implementation code that passes all specified tests.
```

### Agent: refactorer
**역할**: 코드 리팩토링 (TDD의 REFACTOR 단계)
**사용 시점**: 테스트 통과 후
**프롬프트 템플릿**:
```
You are the Refactorer Agent. Improve code quality while keeping tests green.
Focus: Remove duplication, improve naming, apply SOLID principles.
Task: [REFACTOR_TARGET]
Output: Refactored code with all tests still passing.
```

### Agent: reviewer
**역할**: 코드 리뷰 및 품질 검증
**사용 시점**: 구현 완료 후
**프롬프트 템플릿**:
```
You are the Code Reviewer Agent. Review for:
1. Clean Architecture violations
2. Test coverage gaps
3. Security vulnerabilities
4. Performance issues
5. TypeScript best practices
Task: Review [FILE_PATHS]
Output: Review comments with severity (critical/warning/suggestion).
```

### Agent: api-integrator
**역할**: 외부 API 연동 (META, Google Ads, Stripe 등)
**사용 시점**: 외부 서비스 연동 시
**프롬프트 템플릿**:
```
You are the API Integration Agent. Implement external service connections.
Always use infrastructure layer. Create proper interfaces in domain layer.
Task: [API_INTEGRATION_TASK]
Output: Interface in domain/, Implementation in infrastructure/external/.
```

### Agent: db-designer
**역할**: 데이터베이스 스키마 설계 및 마이그레이션
**사용 시점**: 스키마 변경 시
**프롬프트 템플릿**:
```
You are the Database Designer Agent. Design PostgreSQL schemas with Prisma.
Consider: Multi-tenancy, indexing, data integrity, query performance.
Task: [SCHEMA_TASK]
Output: Prisma schema changes + migration strategy.
```

---

## 📋 Work Flow (Standard Process)

### Feature Development Flow
```
1. [Orchestrator] 요구사항 분석 및 Task 분해
2. [architect] 아키텍처 설계 문서 작성
3. [db-designer] 필요시 스키마 설계
4. [test-writer] 실패하는 테스트 작성 (RED)
5. [implementer] 테스트 통과 코드 작성 (GREEN)
6. [refactorer] 코드 개선 (REFACTOR)
7. [reviewer] 최종 리뷰
8. [Orchestrator] 통합 및 검증
```

### Bug Fix Flow
```
1. [Orchestrator] 버그 분석
2. [test-writer] 버그 재현 테스트 작성
3. [implementer] 버그 수정
4. [reviewer] 리뷰
```

---

## 📝 Work Log Rules (필수)

**모든 작업 완료 시 반드시 로그 기록**

### 로그 위치
```
.claude/logs/
├── YYYY-MM-DD.md         # 일별 작업 로그 (기본)
├── features/             # 기능별 상세 이력
│   └── feature-name.md
└── TEMPLATE.md           # 로그 템플릿
```

### 기록 시점
1. **작업 시작**: 요청 사항, 계획 기록
2. **각 단계 완료**: 에이전트별 수행 내용, 변경 파일
3. **작업 종료**: 최종 결과, 다음 작업

### 로그 형식 (간소화)
```markdown
## [HH:MM] 작업명

### 요청
> 사용자 요청 내용

### 수행 내역
| 단계 | 에이전트 | 결과 |
|------|---------|------|
| 설계 | architect | ✅ 완료 |
| 테스트 | test-writer | ✅ 3개 작성 |
| 구현 | implementer | ✅ 완료 |

### 변경 파일
- `src/domain/entities/Campaign.ts` (생성)
- `src/domain/usecases/SyncCampaign.ts` (생성)

### 다음 작업
- [ ] 후속 작업 내용
```

### 오케스트레이터 의무
- **작업 시작 전**: 오늘 날짜 로그 파일 확인/생성
- **작업 완료 후**: 즉시 로그 기록 (지연 금지)
- **긴 작업**: 중간 진행 상황도 기록

---

## 🏗️ Tech Stack Details

### Core
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript 5.x (strict mode)
- **Runtime**: Node.js 20 LTS

### Frontend
- **Styling**: TailwindCSS + shadcn/ui
- **Charts**: Tremor
- **State**: Zustand (필요시)
- **Forms**: React Hook Form + Zod

### Backend
- **ORM**: Prisma
- **Database**: PostgreSQL 15+
- **Auth**: Clerk
- **Payments**: Stripe
- **Background Jobs**: Inngest

### Testing
- **Unit/Integration**: Vitest
- **E2E**: Playwright
- **API Mocking**: MSW (Mock Service Worker)

### DevOps
- **Hosting**: Vercel
- **Database**: Supabase 또는 Neon
- **CI/CD**: GitHub Actions

---

## 📁 File Naming Conventions

```
# Components
ComponentName.tsx        # PascalCase
ComponentName.test.tsx   # 테스트 파일

# Hooks
useHookName.ts          # camelCase with 'use' prefix

# Utils/Services
serviceName.ts          # camelCase
serviceName.test.ts

# Types
types.ts                # 타입 정의
index.ts                # barrel exports

# Domain
Entity.ts               # PascalCase (entities)
IRepository.ts          # 'I' prefix for interfaces
UseCase.ts              # PascalCase (usecases)
```

---

## 🚫 Prohibited Patterns

1. **any 타입 사용 금지** - unknown 또는 proper type 사용
2. **console.log 커밋 금지** - proper logging 사용
3. **테스트 없는 비즈니스 로직 금지**
4. **Domain layer에서 외부 의존성 import 금지**
5. **하드코딩된 설정값 금지** - 환경변수 사용
6. **eslint-disable 남용 금지**

---

## 📝 Commit Convention

```
feat: 새로운 기능 추가
fix: 버그 수정
refactor: 리팩토링
test: 테스트 추가/수정
docs: 문서 수정
chore: 빌드, 설정 변경
```

예시: `feat(campaign): add META campaign sync usecase`

---

## 🔐 Environment Variables

```env
# Database
DATABASE_URL=

# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# META API
META_APP_ID=
META_APP_SECRET=

# Google Ads
GOOGLE_ADS_CLIENT_ID=
GOOGLE_ADS_CLIENT_SECRET=
```

---

## 📊 Current Sprint Status

### Sprint 0: Project Setup
- [ ] Next.js 프로젝트 초기화
- [ ] Clean Architecture 폴더 구조 생성
- [ ] Prisma + PostgreSQL 설정
- [ ] Clerk 인증 설정
- [ ] 기본 테스트 환경 구성 (Vitest)
- [ ] CI/CD 파이프라인 (GitHub Actions)

---

## 🔗 References

- [Clean Architecture by Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Next.js 14 Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Clerk Documentation](https://clerk.com/docs)
