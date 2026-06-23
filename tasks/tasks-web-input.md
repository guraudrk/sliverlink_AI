# Tasks: SilverLink AI – Web Input MVP

기준 문서: `docs/PRD-web-input.md`

## Relevant Files (이미 스캐폴드된 빈 파일)
- `src/components/task-request-form.tsx` — 작업 요청 입력 폼 (클라이언트 컴포넌트)
- `src/lib/silverlink/schema.ts` — Zod 검증 스키마 (클라이언트/서버 공용)
- `src/lib/silverlink/payload.ts` — 폼 데이터 → Make.com payload 변환
- `src/lib/silverlink/time.ts` — 날짜/시간/타임존 유틸
- `src/lib/silverlink/env.ts` — 서버 전용 환경변수 로더
- `src/lib/silverlink/make-client.ts` — Make.com Webhook 호출 클라이언트 (DRY_RUN 지원)
- `src/app/api/create-task/route.ts` — 작업 요청 생성 API Route
- `src/lib/silverlink/__tests__/schema.test.ts` — 스키마 유닛 테스트
- `src/lib/silverlink/__tests__/payload.test.ts` — payload 변환 유닛 테스트
- `tests/e2e/create-task.spec.ts` — 폼 제출 e2e 테스트
- `.env.local` — `MAKE_WEBHOOK_URL`, `SILVERLINK_DRY_RUN` (이미 존재, 값은 로컬 전용)
- `.env.example` — 환경변수 예시 (값 마스킹)
- `package.json` — Zod·테스트 러너 의존성 추가 대상

## Notes
- 아직 구현 코드는 작성하지 않는다. 하위 테스크 생성 전까지는 계획 단계.
- 각 상위 테스크는 "Go" 입력 후 세부 하위 테스크로 분해된다.
- 구현 단계 진입 전 `node_modules/next/dist/docs/`에서 이 Next.js 버전(16.2.9)의 관련 가이드를 확인해야 한다 (AGENTS.md 지침).

## Tasks

- [ ] 1.0 기반 설정: 의존성 및 환경변수 확정 (Zod 직접 의존성 추가, 테스트 러너 선정, `.env.example` 정리)
- [ ] 2.0 검증 스키마 구현: `schema.ts`에 `TaskRequest` Zod 스키마 및 타입 정의
- [ ] 3.0 환경변수 로더 구현: `env.ts`에서 서버 전용 가드로 `MAKE_WEBHOOK_URL`/`SILVERLINK_DRY_RUN` 로드 및 검증
- [ ] 4.0 시간 유틸 구현: `time.ts`에 KST 기준 포맷/변환 함수
- [ ] 5.0 Payload 변환 구현: `payload.ts`에서 검증된 입력 → Make.com payload 매핑 (메타데이터 포함)
- [ ] 6.0 Make.com 클라이언트 구현: `make-client.ts`에 DRY_RUN 분기, 타임아웃/에러 처리 포함 fetch 호출
- [ ] 7.0 API Route 구현: `app/api/create-task/route.ts`에서 검증 → payload 변환 → make-client 호출 → 응답 처리
- [ ] 8.0 폼 컴포넌트 구현: `task-request-form.tsx`에 입력 필드, 클라이언트 검증, 제출/에러/성공 상태 처리
- [ ] 9.0 유닛 테스트 작성: `schema.test.ts`, `payload.test.ts`
- [ ] 10.0 e2e 테스트 작성: `create-task.spec.ts` (DRY_RUN 모드 기준 성공/실패 플로우)
- [ ] 11.0 보안 점검 및 마무리: Webhook URL 비노출 확인, DRY_RUN=false 실연동 1회 점검, 문서 업데이트

---

"Go"라고 입력하면 위 상위 테스크를 하위 테스크로 분해하겠습니다.
