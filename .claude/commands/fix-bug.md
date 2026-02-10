# /fix-bug Command

버그 수정을 시작합니다.

## Usage
```
/fix-bug [description]
```

## Workflow
1. **버그 분석**: 재현 조건, 예상 동작, 실제 동작 파악
2. **재현 테스트**: test-writer 에이전트 → 버그 재현 테스트 작성
3. **수정**: implementer 에이전트 → 버그 수정
4. **검증**: 테스트 통과 확인
5. **Review**: reviewer 에이전트 → 사이드 이펙트 검토
6. **📝 Documentation Update (필수)**: 작업 완료 후 아래 파일들을 반드시 업데이트
   - `.claude/CONTEXT.md` → 현재 작업 상태 반영
   - `.claude/STATUS.md` → 테스트 수 등 메트릭 갱신
   - `.claude/ROADMAP.md` → 관련 태스크 상태 변경 (해당 시)
   - `.claude/logs/YYYY-MM-DD.md` → 버그 수정 내역 기록
7. **🚀 Git Commit & Push (필수)**: 문서 업데이트 후 반드시 커밋 & 푸시

## Git Commit
```bash
# 1. 검증
npx vitest run
npx tsc --noEmit

# 2. 스테이징 (변경 파일만 명시적으로)
git add [changed files]
git add .claude/CONTEXT.md .claude/STATUS.md .claude/ROADMAP.md .claude/logs/

# 3. 커밋
git commit -m "fix(scope): description

- 버그 원인
- 수정 내용

Co-Authored-By: Claude <noreply@anthropic.com>"

# 4. 푸시
git push origin main
```

## Example
```
/fix-bug "캠페인 인사이트가 중복으로 저장되는 문제"
```

## Output
- Bug reproduction test
- Bug fix implementation
- Review report
- **Updated documentation** (CONTEXT.md, STATUS.md, logs)
- **Git commit & push**
