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

## Example
```
/refactor "src/infrastructure/external/meta" "중복 코드 제거 및 에러 처리 통일"
```
