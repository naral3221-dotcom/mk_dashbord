# Orchestrator Guide

## Role
당신(Main Agent)은 **오케스트레이터**입니다. 직접 코딩하지 않고, 서브에이전트들을 지휘합니다.

---

## 🧠 Context Management (핵심 임무)

**바이브 코딩 시 컨텍스트가 끊기지 않도록 상태를 지속적으로 관리합니다.**

### 컨텍스트 파일
| 파일 | 용도 | 업데이트 시점 |
|------|------|--------------|
| `.claude/CONTEXT.md` | 현재 작업 상태 | 매 작업 완료 시 |
| `.claude/STATUS.md` | 전체 진행 상황 | 태스크 상태 변경 시 |
| `.claude/logs/YYYY-MM-DD.md` | 일별 상세 로그 | 매 작업 완료 시 |

### 세션 시작 시 (필수)
```
1. Read(".claude/CONTEXT.md")     # 현재 상태 확인
2. Read(".claude/STATUS.md")      # 전체 진행 상황 확인
3. Read(".claude/logs/{오늘날짜}.md")  # 오늘 작업 내역 확인
4. Read("CLAUDE.md")              # 프로젝트 규칙 재확인
```

### 작업 중 업데이트 타이밍
1. **작업 시작**: 진행 중인 작업 업데이트
2. **중간 단계 완료**: 에이전트 결과 기록
3. **작업 완료**: 최종 상태 반영
4. **블로커 발생**: 즉시 기록

### 세션 종료/중단 시 (필수)
```
1. CONTEXT.md 업데이트 - 현재 상태, 다음 작업
2. STATUS.md 업데이트 - 완료된 태스크 체크
3. 로그 파일 업데이트 - 상세 내역
4. 사용자에게 요약 보고
```

### 컨텍스트 복원 (새 세션 시작)
세션이 새로 시작되면:
```
📍 컨텍스트 복원 완료

마지막 작업: [작업명]
상태: [진행 중 / 완료]
다음 단계: [다음 작업]

계속 진행할까요?
```

---

## Sub-Agent 호출 방법

Task tool을 사용하여 서브에이전트를 호출합니다:

```
Task tool parameters:
- subagent_type: "Plan" (architect, db-designer) 또는 "general-purpose" (implementer, test-writer)
- model: "opus" (모든 에이전트에 opus 사용)
- prompt: 에이전트 프롬프트 + 구체적 태스크
```

## Standard Workflow

### 1. 요구사항 분석
```
사용자 요청 → 요구사항 분해 → TodoWrite로 태스크 목록 생성
```

### 2. 아키텍처 설계 (architect)
```typescript
Task({
  subagent_type: "Plan",
  model: "opus",
  prompt: `
    [Architect Agent Instructions]
    ${readFile('.claude/agents/architect.md')}

    [Task]
    Design architecture for: {FEATURE_DESCRIPTION}

    [Current Project Structure]
    ${projectStructure}
  `
})
```

### 3. 테스트 작성 (test-writer) - TDD RED
```typescript
Task({
  subagent_type: "general-purpose",
  model: "opus",
  prompt: `
    [Test Writer Agent Instructions]
    ${readFile('.claude/agents/test-writer.md')}

    [Task]
    Write failing tests for: {FEATURE_DESCRIPTION}

    [Architecture Design]
    ${architectOutput}
  `
})
```

### 4. 구현 (implementer) - TDD GREEN
```typescript
Task({
  subagent_type: "general-purpose",
  model: "opus",
  prompt: `
    [Implementer Agent Instructions]
    ${readFile('.claude/agents/implementer.md')}

    [Task]
    Implement to pass these tests: {TEST_FILES}

    [Test Files]
    ${testCode}
  `
})
```

### 5. 리팩토링 (refactorer) - TDD REFACTOR
```typescript
Task({
  subagent_type: "general-purpose",
  model: "opus",
  prompt: `
    [Refactorer Agent Instructions]
    ${readFile('.claude/agents/refactorer.md')}

    [Task]
    Refactor: {IMPLEMENTATION_FILES}
    Ensure all tests pass.
  `
})
```

### 6. 리뷰 (reviewer)
```typescript
Task({
  subagent_type: "general-purpose",
  model: "opus",
  prompt: `
    [Reviewer Agent Instructions]
    ${readFile('.claude/agents/reviewer.md')}

    [Task]
    Review these changes: {CHANGED_FILES}
  `
})
```

## Parallel Execution

독립적인 태스크는 병렬로 실행합니다:

```typescript
// 여러 서브에이전트 동시 실행 예시
await Promise.all([
  Task({ /* architect for feature A */ }),
  Task({ /* architect for feature B */ }),
])
```

## Error Handling

서브에이전트 실패 시:
1. 에러 분석
2. 필요시 재시도 (다른 접근법으로)
3. 사용자에게 보고

## Progress Tracking

TodoWrite를 사용하여 진행 상황 추적:
```
- [ ] Feature X: Architecture design
- [x] Feature X: Write tests
- [ ] Feature X: Implementation
- [ ] Feature X: Refactoring
- [ ] Feature X: Review
```

## Communication with User

- 각 단계 완료 후 요약 보고
- 중요한 결정 포인트에서 확인 요청
- 에러 발생 시 즉시 보고

---

## 📝 Work Log (필수)

**모든 작업 완료 시 반드시 `.claude/logs/`에 기록**

### 작업 시작 시
```typescript
// 1. 오늘 날짜 로그 파일 확인
const today = "2026-02-09";  // YYYY-MM-DD
const logFile = `.claude/logs/${today}.md`;

// 2. 파일 없으면 생성
if (!exists(logFile)) {
  Write(logFile, `# Work Log - ${today}\n\n`);
}
```

### 작업 완료 시
```markdown
## [14:30] 캠페인 동기화 기능 구현

### 요청
> META 캠페인 데이터를 동기화하는 기능 추가

### 수행 내역
| 단계 | 에이전트 | 결과 |
|------|---------|------|
| 설계 | architect | ✅ Clean Architecture 설계 완료 |
| 테스트 | test-writer | ✅ 5개 테스트 작성 |
| 구현 | implementer | ✅ 테스트 통과 |
| 리팩토링 | refactorer | ✅ 중복 제거 |
| 리뷰 | reviewer | ✅ APPROVED |

### 변경 파일
- `src/domain/entities/Campaign.ts` (생성)
- `src/domain/repositories/ICampaignRepository.ts` (생성)
- `src/domain/usecases/SyncCampaignUseCase.ts` (생성)
- `src/infrastructure/external/meta/MetaCampaignRepository.ts` (생성)
- `src/domain/usecases/SyncCampaignUseCase.test.ts` (생성)

### 테스트 결과
```
✓ 5 passed
```

### 다음 작업
- [ ] Google Ads 연동 추가
```

### 로그 기록 규칙
1. **즉시 기록**: 작업 완료 후 바로 (지연 금지)
2. **구체적으로**: 변경된 파일, 테스트 결과 포함
3. **연속성**: 다음 작업 항목 명시
4. **실패도 기록**: 실패/블로커도 반드시 기록

### 대규모 기능 (별도 파일)
장기 작업은 `.claude/logs/features/feature-name.md`에 별도 관리:
```markdown
# Feature: Campaign Sync

## Overview
- 시작일: 2026-02-09
- 상태: In Progress

## Progress
### Day 1 (2026-02-09)
- 아키텍처 설계 완료
- 엔티티 정의 완료

### Day 2 (2026-02-10)
- META API 연동 완료
...
```

---

## 🗺️ Roadmap Management

**로드맵 파일**: `.claude/ROADMAP.md`

### 로드맵 업데이트 시점
1. **태스크 완료**: 해당 태스크 Status를 ✅ Done으로 변경
2. **계획 변경**: 태스크 추가/삭제/순서 변경 시
3. **스프린트 전환**: 새 스프린트 시작 시

### 로드맵 수정 형식
```markdown
## Sprint X: Name ⬅️ CURRENT  # 현재 스프린트 표시

| # | Task | Status | Agent | Commit |
|---|------|--------|-------|--------|
| X.1 | 태스크명 | ✅ Done | agent | abc1234 |  # 완료 시
| X.2 | 태스크명 | 🔄 In Progress | agent | |      # 진행 중
| X.3 | 태스크명 | ⬜ Todo | agent | |              # 대기

## 📋 Changelog
### YYYY-MM-DD
- 변경 내용 기록
```

---

## 🔄 Git Workflow (필수)

**Repository**: `https://github.com/naral3221-dotcom/mk_dashbord.git`

### 작업 완료 시 자동 커밋 & 푸시
```bash
# 1. 변경 파일 스테이징
git add [changed files]

# 2. 커밋 (컨벤션 준수)
git commit -m "feat(scope): description

- 상세 내용 1
- 상세 내용 2

Co-Authored-By: Claude <noreply@anthropic.com>"

# 3. 푸시
git push origin main
```

### 커밋 타이밍 (모든 작업 완료 시)
1. **단일 태스크 완료**: 즉시 커밋 & 푸시
2. **여러 관련 태스크**: 묶어서 하나의 커밋
3. **문서 변경**: 별도 커밋 (`docs:` prefix)

### 커밋 체크리스트
```
커밋 전:
[ ] 테스트 통과 확인
[ ] ESLint 에러 없음
[ ] 빌드 성공
[ ] ROADMAP.md 업데이트됨
[ ] 로그 파일 업데이트됨
```

### 커밋 메시지 예시
```
feat(domain): add Campaign entity with tests

- Campaign entity with id, name, spend properties
- ICampaignRepository interface
- Unit tests (5 passing)

Task: 1.4
Co-Authored-By: Claude <noreply@anthropic.com>
```

### 브랜치 전략
```
main ─────────────────────────────────────────
  │
  └── feature/sprint-0-setup (필요시)
  └── feature/campaign-sync (필요시)
```
기본적으로 main 브랜치 직접 커밋, 큰 기능은 feature 브랜치

### Git 에러 처리
```
Push 실패 시:
1. git pull --rebase origin main
2. 충돌 해결
3. git push origin main
```
