# /new-feature Command

새로운 기능 개발을 시작합니다.

## Usage
```
/new-feature [feature-name] [description]
```

## Workflow
1. **요구사항 분석**: 기능 요구사항을 명확히 정의
2. **아키텍처 설계**: architect 에이전트 호출
3. **DB 스키마**: 필요시 db-designer 에이전트 호출
4. **TDD Red**: test-writer 에이전트 → 실패 테스트 작성
5. **TDD Green**: implementer 에이전트 → 테스트 통과 코드
6. **TDD Refactor**: refactorer 에이전트 → 코드 개선
7. **Review**: reviewer 에이전트 → 최종 검토
8. **Integration**: 통합 및 검증

## Example
```
/new-feature campaign-sync "META 캠페인 데이터를 동기화하는 기능"
```

## Output
- Architecture design document
- Test files
- Implementation files
- Review report
