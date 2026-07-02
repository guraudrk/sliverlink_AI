# Tasks: Day 20 — 카카오 알림톡 연동 + 실제 발송 end-to-end 테스트

기준 문서: `docs/PRD-day20-kakao-real-test.md`

## 중요 — 안전 규칙
- 실제 음성/SMS 발신 테스트는 이 대화에서 사용자가 "지금 걸어봐 / 지금 보내봐"라고 명시할 때만 실행.
- 테스트는 사전에 등록된 본인 번호로만. 부모님 실제 번호는 동의 전 사용 금지.
- `SOLAPI_KAKAO_PF_ID` 포함 모든 API 키 값은 채팅·커밋·문서에 노출 금지.
- `ENABLE_REAL_KAKAO` 기본값은 항상 `false`. 코드·문서·커밋에서 실수로 `true` 하드코딩 금지.

## Relevant Files (예상)
- `src/lib/silverlink/delivery/solapi-kakao-provider.ts` (신규) — 카카오 알림톡 Provider
- `src/app/api/delivery/preview/route.ts` — 카카오 채널 분기 추가
- `.env.example` — `ENABLE_REAL_KAKAO`, `SOLAPI_KAKAO_PF_ID` 추가
- `docs/deployment-guide.md` — 카카오 비즈니스 채널 신청 안내
- `README.md`, `docs/work-log.md` — Day20 항목

---

## Slice 1 — [완료] Vercel 환경변수 등록
- ✅ `SOLAPI_API_KEY`, `SOLAPI_API_SECRET`, `SOLAPI_SENDER_NUMBER`, `SOLAPI_WEBHOOK_SECRET` 등록
- ✅ `ENABLE_REAL_SMS=true`, `ENABLE_REAL_CALLS=true` 설정 완료

## Slice 2 — 실제 SMS 발송 테스트 (배포 환경)

> ⚠️ 사용자가 "지금 보내봐"라고 명시할 때 실행. 코드 변경 없음, 테스트 절차만.

- [ ] 2.1 Vercel 배포 앱(`https://silverlink-ai.vercel.app`) 로그인
- [ ] 2.2 대시보드 → 케어 업무 카드 선택 → "알림 발송" 버튼 → SMS 탭 선택
- [ ] 2.3 수신 번호를 본인 번호로 설정 후 발송
- [ ] 2.4 본인 폰에서 문자 수신 확인
- [ ] 2.5 `/dashboard/deliveries`에서 해당 발송 기록 확인 (`status: "sent"`)
- [ ] 2.6 실패 시 `error_code` / `error_message` 기록 후 디버깅
  - 흔한 원인: Vercel 환경변수 오타, Solapi 잔액 부족, 발신번호 미등록

## Slice 3 — 실제 음성 TTS 전화 테스트 (배포 환경)

> ⚠️ 사용자가 "지금 걸어봐"라고 명시할 때 실행. 코드 변경 없음, 테스트 절차만.

- [ ] 3.1 대시보드 → 케어 업무 카드 선택 → "알림 발송" 버튼 → AI 안부전화 탭 선택
- [ ] 3.2 수신 번호를 본인 번호로 설정 후 발송
- [ ] 3.3 전화 수신 후 TTS 메시지 청취
- [ ] 3.4 키패드 1번 (완료) 또는 2번 (도움 요청) 응답
- [ ] 3.5 `/dashboard/deliveries`에서 해당 발송 기록 확인
  - Slice 4(웹훅) 설정 전: `status: "sent"` + 수동 "응답 확인" 버튼으로 폴링
  - Slice 4 설정 후: `status: "answered"` + `replyKey` 자동 갱신 확인

## Slice 4 — Solapi 웹훅 실제 연결

> 코드 변경 없음. Solapi 콘솔 설정 작업.

- [ ] 4.1 Solapi 콘솔(console.solapi.com) 로그인
- [ ] 4.2 설정 → 상태보고 → 음성 상태보고 URL 등록
  - URL: `https://silverlink-ai.vercel.app/api/voice/solapi-status?secret=<SOLAPI_WEBHOOK_SECRET 값>`
  - (키 값은 이 문서에 적지 않음 — Vercel 환경변수에서 확인)
- [ ] 4.3 Slice 3 음성 발신 후 Vercel 대시보드 → Functions 로그에서 Push 수신 로그 확인
  - 기대 로그: `[solapi-status webhook] received: { messageId: "...", status: "ANSWERED", dtmf: "1" }`
- [ ] 4.4 Supabase `delivery_attempts` 테이블에서 해당 행의 `status`가 `answered`로 갱신됐는지 확인
- [ ] 4.5 `/dashboard/deliveries` 상세 모달에서 `voiceReplied: true` + 키 번호 표시 확인

## Slice 5 — SolapiKakaoProvider 구현

- [ ] 5.1 현재 `DeliveryProvider` 인터페이스 확인 (반환 타입, 메서드 시그니처)
  - `src/lib/silverlink/delivery/` 디렉토리 내 기존 Provider 파일 참조
- [ ] 5.2 `src/lib/silverlink/delivery/solapi-kakao-provider.ts` 신규
  - `SOLAPI_KAKAO_PF_ID` 환경변수 읽기 (없으면 즉시 `{ status: "failed", error_code: "KAKAO_PF_ID_MISSING" }` 반환)
  - `solapi` SDK: `service.send({ type: "ATA", to: phone, kakaoOptions: { pfId, templateId, variables } })`
  - 성공 시 `{ status: "sent", external_message_id: result.messageId }` 반환
  - 실패 시 `{ status: "failed", error_code: result.failedMessageList[0]?.errorCode, error_message: ... }` 반환
- [ ] 5.3 `src/app/api/delivery/preview/route.ts` 분기 추가
  - `channel === "kakao_alimtalk"` 분기:
    - `ENABLE_REAL_KAKAO !== "true"` → `MockDeliveryProvider` (기존 Mock 사용)
    - `ENABLE_REAL_KAKAO === "true"` → `SolapiKakaoProvider`
- [ ] 5.4 `.env.example`에 추가:
  ```
  # 카카오 알림톡 (카카오 비즈니스 채널 승인 후 설정)
  ENABLE_REAL_KAKAO=false
  SOLAPI_KAKAO_PF_ID=
  ```
- [ ] 5.5 `npx tsc --noEmit` 클린 확인

## Slice 6 — 카카오 Mock 검증 + 문서 정리

- [ ] 6.1 로컬 `npm run dev` 실행
- [ ] 6.2 발송 모달 → 카카오 알림톡 탭 선택 → 발송
  - `ENABLE_REAL_KAKAO=false` 상태에서 Mock 발송이 정상 동작하는지 확인
  - `/dashboard/deliveries`에서 `channel: "kakao_alimtalk"`, `status: "sent"` (Mock) 기록 확인
- [ ] 6.3 `npm run build` 성공 확인
- [ ] 6.4 `README.md`에 Day 20 섹션 추가
  - SMS / 음성 전화 end-to-end 테스트 완료 표시
  - 카카오 알림톡: 코드 준비 완료, 채널 승인 후 실사용 가능으로 표기
- [ ] 6.5 `docs/deployment-guide.md`에 카카오 비즈니스 채널 신청 방법 추가:
  - kakao for business 채널 생성 → Solapi 콘솔에 채널 연동 → pfId 확인 → Vercel에 `SOLAPI_KAKAO_PF_ID` 등록 → `ENABLE_REAL_KAKAO=true`
  - 알림톡 템플릿 등록 및 심사(영업일 1~3일) 안내
- [ ] 6.6 `docs/work-log.md`에 Day 20 항목 작성
- [ ] 6.7 git commit + push (사용자가 명시적으로 요청 시)

---

## 빠른 참고 — Solapi 카카오 알림톡 SDK 패턴

```typescript
import SolapiMessageService from "solapi";

const service = new SolapiMessageService(apiKey, apiSecret);

await service.send({
  type: "ATA",
  to: "010-XXXX-XXXX",
  from: senderNumber,
  kakaoOptions: {
    pfId: process.env.SOLAPI_KAKAO_PF_ID!,
    templateId: "KA01TP...",  // 승인된 템플릿 ID
    variables: { "#{name}": "홍길동", "#{task}": "혈압약 복용" },
  },
});
```

> 참고: 카카오 알림톡은 사전 승인된 템플릿만 사용 가능. 자유 문자열 발송 불가.
> 이번 Day에는 템플릿 미등록 상태로 코드만 완성하고, pfId 없을 때 graceful fallback 처리에 집중.
