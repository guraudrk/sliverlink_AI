# SilverLink AI — Day 20: 카카오 알림톡 연동 + 실제 발송 end-to-end 테스트 (PRD)

## 0. 문서 정보

Day 20은 두 가지 축으로 진행한다.

1. **카카오 알림톡 채널 연동**: Solapi 동일 계정으로 카카오 알림톡 발송 Provider 구현.
2. **실제 발송 end-to-end 테스트**: 배포된 Vercel 환경에서 실제 SMS 문자·음성 TTS 전화를 직접 받아보고 키패드 응답까지 기록되는 전체 흐름을 확인.

> ✅ **Slice 1 완료**: Vercel 환경변수(`SOLAPI_API_KEY`, `SOLAPI_API_SECRET`, `SOLAPI_SENDER_NUMBER`, `SOLAPI_WEBHOOK_SECRET`)가 이미 등록됨.

## 1. 목표

| 목표 | 완료 기준 |
|---|---|
| 실제 SMS를 배포 환경에서 보내고 받는다 | 대시보드 발송 → 폰으로 문자 수신 → 발송 기록에 `sent` 표시 |
| 실제 음성 TTS 전화를 배포 환경에서 걸고 받는다 | 대시보드 발송 → 전화 수신 → 키패드 응답 → 발송 기록에 `answered` + 키 번호 표시 |
| Solapi 웹훅 Push가 실제로 수신된다 | Solapi 콘솔 상태보고 URL 등록 → 발신 후 `/api/voice/solapi-status`로 Push 수신 확인 |
| 카카오 알림톡 Provider 코드가 준비된다 | `SolapiKakaoProvider` 구현 + `ENABLE_REAL_KAKAO=false`(기본) Mock 검증 |

## 2. 배경 및 제약

### 카카오 알림톡
- Solapi 동일 계정에서 카카오 알림톡 발송 가능 (`kakaoOptions.pfId` 필요).
- **카카오 비즈니스 채널 사전 승인 필요**: 개인 카카오계정으로 비즈니스 채널을 만들고 검수 승인(영업일 1~3일, 반려 가능)을 받아야 실제 발송 가능.
- 코드는 이번 Day에 완성하되, 채널 승인 전에는 `ENABLE_REAL_KAKAO=false` Mock 모드로만 검증.
- 알림톡 템플릿 심사도 별도로 필요. 이번 Day에는 코드 구조만 완성하고 템플릿 등록은 post-MVP.

### 실제 발송 테스트
- 이미 `.env.local`에 Solapi 자격증명이 있고 스크래치패드 테스트(Day17 세션1)에서 실제 SMS 수신 확인 완료.
- 이번에는 **배포된 Vercel 앱의 UI에서** 발송해 전체 end-to-end 흐름을 검증.
- 음성 테스트는 사용자가 이 대화에서 명시적으로 "지금 걸어봐"라고 할 때만 실행 ([[feedback_safety_constraints]] 원칙).
- `ENABLE_REAL_SMS=true`, `ENABLE_REAL_CALLS=true` Vercel 환경변수는 이미 등록됨(Slice 1 완료).

## 3. 아키텍처

### 3-1. 카카오 알림톡 (SolapiKakaoProvider)

```
SendNotificationModal (channel: "kakao_alimtalk" 이미 탭 존재)
        │
POST /api/delivery/preview  { channel: "kakao_alimtalk", message_text }
        │
        ├─ ENABLE_REAL_KAKAO=false (기본) → MockDeliveryProvider
        │
        ▼ ENABLE_REAL_KAKAO=true + pfId 설정됨
[SolapiKakaoProvider]
  service.send({
    type: "ATA",  // 알림톡(Alimtalk)
    to: phone,
    kakaoOptions: { pfId: SOLAPI_KAKAO_PF_ID, templateId, variables }
  })
        │
  delivery_attempts 기록 (channel: "kakao_alimtalk")
```

### 3-2. 실제 발송 end-to-end 테스트 흐름

```
Vercel 배포 앱 (ENABLE_REAL_SMS=true, ENABLE_REAL_CALLS=true)
  │
  ├─ [SMS 테스트]
  │    대시보드 → SendNotificationModal (SMS 탭)
  │    → POST /api/delivery/preview (SolapiSmsProvider)
  │    → Solapi API → 폰으로 문자 수신 ✓
  │    → delivery_attempts "sent" ✓
  │    → /dashboard/deliveries에서 기록 확인 ✓
  │
  └─ [음성 테스트]
       대시보드 → SendNotificationModal (AI 안부전화 탭)
       → POST /api/delivery/preview (SolapiVoiceProvider)
       → Solapi TTS 전화 발신 → 전화 수신 → 키패드 1 or 2 응답
       → Solapi 상태보고 URL로 Push (또는 "응답 확인" 버튼 폴링)
       → delivery_attempts "answered" + replyKey ✓
       → /dashboard/deliveries 모달에서 확인 ✓
```

## 4. Slice별 상세

### Slice 1 — [완료] Vercel 환경변수 등록
- ✅ `SOLAPI_API_KEY`, `SOLAPI_API_SECRET`, `SOLAPI_SENDER_NUMBER`, `SOLAPI_WEBHOOK_SECRET` 등록 완료
- ✅ `ENABLE_REAL_SMS=true`, `ENABLE_REAL_CALLS=true` 설정 완료

### Slice 2 — 실제 SMS 발송 테스트 (배포 환경)
- Vercel 앱에서 대시보드 → 케어 업무 선택 → SMS 채널 발송
- 테스트 번호(사용자 본인 번호)로 실제 문자 수신 확인
- `/dashboard/deliveries`에서 `sent` 상태 기록 확인
- 실패 시 에러 메시지 확인 (`error_code`, `error_message`)

### Slice 3 — 실제 음성 TTS 전화 테스트 (배포 환경)
- Vercel 앱에서 대시보드 → AI 안부전화(TTS) 채널 발송
- 전화 수신 후 키패드 1번 (완료) 또는 2번 (도움 요청) 응답
- 응답 확인 방법 (둘 중 하나):
  - **폴링**: 발신 완료 화면의 "응답 확인" 버튼 클릭 → `voiceReplied: true`, `replyKey` 표시
  - **웹훅**: Slice 4에서 설정 후 자동으로 DB 갱신
- `/dashboard/deliveries` 상세 모달에서 `answered` + 눌린 키 확인

### Slice 4 — Solapi 웹훅 실제 연결
- Solapi 콘솔 로그인 → 설정 → 상태보고 URL (음성용)
- 등록 URL: `https://silverlink-ai.vercel.app/api/voice/solapi-status?secret=<SOLAPI_WEBHOOK_SECRET 값>`
- 음성 발신 후 Vercel 함수 로그에서 Push 수신 확인 (Vercel 대시보드 → Functions → 로그)
- `delivery_attempts.status`가 `answered`로 자동 갱신됐는지 확인

### Slice 5 — SolapiKakaoProvider 구현
- `src/lib/silverlink/delivery/solapi-kakao-provider.ts` 신규 (DeliveryProvider 인터페이스 구현)
  - `solapi` SDK의 `service.send({ type: "ATA", kakaoOptions: { pfId, templateId } })`
  - `SOLAPI_KAKAO_PF_ID` 환경변수 읽기 (없으면 `status: "failed"` 반환, 발송 없음)
- `ENABLE_REAL_KAKAO=false` 플래그 추가 (기본값 false)
- `/api/delivery/preview`에 카카오 채널 분기 추가 (기존 `kakao_alimtalk` 채널과 연결)
- `.env.example`에 `ENABLE_REAL_KAKAO=false`, `SOLAPI_KAKAO_PF_ID=` 추가

### Slice 6 — 카카오 Mock 검증 + 문서 정리
- `ENABLE_REAL_KAKAO=false` 상태에서 발송 모달 → 카카오 알림톡 채널 선택 → Mock 발송 정상 동작 확인
- `npx tsc --noEmit` 클린, `npm run build` 성공
- `README.md` 10장 항목 업데이트 (카카오 알림톡: 코드 준비 완료, 채널 승인 후 실사용 가능)
- 카카오 비즈니스 채널 신청 방법 `docs/deployment-guide.md`에 안내 추가

## 5. 안전 규칙

- 실제 음성 발신 테스트는 이 대화에서 사용자가 "지금 걸어봐/지금 테스트해"라고 명시할 때만 실행.
- 테스트는 사전에 등록된 본인 번호로만. 부모님 실제 번호는 동의 전 사용 금지.
- `SOLAPI_KAKAO_PF_ID` 포함 모든 API 키 값은 채팅·커밋·문서에 노출 금지.

## 6. 완료 기준

- [ ] 배포 환경에서 실제 SMS를 발송하고 폰으로 수신 확인
- [ ] 배포 환경에서 실제 음성 TTS 전화를 걸고 키패드 응답까지 기록 확인
- [ ] Solapi 웹훅 Push가 `/api/voice/solapi-status`로 수신되고 DB가 자동 갱신됨
- [ ] `SolapiKakaoProvider` 코드 완성, Mock 모드로 정상 동작
- [ ] `npx tsc --noEmit` 클린, `npm run build` 성공
