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

## Example
```
/fix-bug "캠페인 인사이트가 중복으로 저장되는 문제"
```
