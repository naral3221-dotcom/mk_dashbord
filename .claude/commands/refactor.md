# /refactor Command

코드 리팩토링을 시작합니다.

## Usage
```
/refactor [target] [goal]
```

## Workflow
1. **현재 상태 분석**: 리팩토링 대상 코드 파악
2. **테스트 확인**: 기존 테스트 통과 확인
3. **리팩토링**: refactorer 에이전트 → 코드 개선
4. **검증**: 모든 테스트 통과 확인
5. **Review**: reviewer 에이전트 → 변경 사항 검토
6. **📝 Documentation Update (필수)**: 작업 완료 후 아래 파일들을 반드시 업데이트
   - `.claude/CONTEXT.md` → 현재 작업 상태 반영
   - `.claude/STATUS.md` → 메트릭 갱신 (해당 시)
   - `.claude/logs/YYYY-MM-DD.md` → 리팩토링 내역 기록
7. **🚀 Git Commit & Push (필수)**: 문서 업데이트 후 반드시 커밋 & 푸시

## Git Commit
```bash
# 1. 검증
npx vitest run
npx tsc --noEmit

# 2. 스테이징 (변경 파일만 명시적으로)
git add [changed files]
git add .claude/CONTEXT.md .claude/STATUS.md .claude/logs/

# 3. 커밋
git commit -m "refactor(scope): description

- 변경 내용

Co-Authored-By: Claude <noreply@anthropic.com>"

# 4. 푸시
git push origin main
```

## Example
```
/refactor "src/infrastructure/external/meta" "중복 코드 제거 및 에러 처리 통일"
```

## Output
- Refactored code (all tests still passing)
- Review report
- **Updated documentation** (CONTEXT.md, STATUS.md, logs)
- **Git commit & push**
