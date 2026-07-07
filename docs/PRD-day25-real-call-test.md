# SilverLink AI — Day 25: 실제 AI 안부전화 연동 테스트

## 0. 문서 정보
- 작성일: 2026-07-07
- 목적: Day 21~24 기능 구현 완료 후, 실제 Solapi Voice API를 통한 전화 발신 검증
- 전제 조건: Day 21~24 모두 완료 + 아래 사전 요건 충족
- 이전 차단 이유: Solapi 에러 1011 — 발신번호(010-7774-7638)와 수신번호가 동일할 때 API가 차단. 다른 수신번호 확보 필요.

---

## 1. 사전 요건 체크리스트

Day 25 작업을 시작하기 전 아래 항목을 모두 확인한다.

| 항목 | 확인 방법 | 필요 조건 |
|------|---------|---------|
| 발신번호 등록 | Solapi 대시보드 → 발신번호 관리 | `010-7774-7638` 등록·승인됨 |
| 수신번호 준비 | 본인 또는 가족의 **발신번호와 다른** 전화기 | 예: `010-XXXX-YYYY` |
| SOLAPI_API_KEY 설정 | Vercel 환경변수 또는 `.env.local` | 값 존재 확인 |
| SOLAPI_API_SECRET 설정 | 동일 | 값 존재 확인 |
| ENABLE_REAL_CALLS 플래그 | `.env.local`에서 확인 | 기본값 `false` (안전) |
| care_call_schedules 동의 | DB `consent_status` 컬럼 | `test_only` 이상 |

---

## 2. 구현 작업

### 2-1. ENABLE_REAL_CALLS 환경변수 연동 확인

기존 코드에서 `ENABLE_REAL_CALLS` 플래그가 Solapi Voice 호출을 실제로 막고 있는지 확인.

**확인 파일:** `src/lib/silverlink/delivery/solapi-voice-provider.ts`

```
ENABLE_REAL_CALLS=false → Mock 응답 반환 (전화 실제 발신 없음)
ENABLE_REAL_CALLS=true  → Solapi API 실제 호출
```

### 2-2. 수신번호 등록 UI (선택 사항)

부모님 프로필의 `phone` 필드가 이미 있으므로, 별도 UI 없이 기존 부모님 프로필 수정 화면에서 수신 전화번호를 입력한다.

### 2-3. /api/care-calls/[attemptId]/start 실제 전화 분기 확인

기존 start route에서 `ENABLE_REAL_CALLS=true`일 때 Solapi Voice를 호출하는 분기가 올바르게 동작하는지 검증.

```
현재 흐름:
  Mock 전화 실행 → /api/care-calls/[attemptId]/start
    → provider = "mock" (ENABLE_REAL_CALLS=false)
    → provider = "solapi_voice" (ENABLE_REAL_CALLS=true)
```

### 2-4. Solapi 상태 Webhook 연동 확인

실제 전화가 걸린 후 Solapi가 상태 변경(발신 중 → 연결됨 → 종료)을 webhook으로 전송한다.

**기존 webhook route 확인:** `src/app/api/voice/solapi-status/route.ts`
- 수신한 payload를 `care_call_attempts` 테이블에 반영하는지 확인
- Vercel 배포 URL이 Solapi 대시보드에 등록되어 있는지 확인

---

## 3. 단계별 테스트 시나리오

### Phase 1 — 로컬 Mock 재확인 (5분)

1. `ENABLE_REAL_CALLS=false` 상태에서 Mock 전화 전체 흐름 재확인
2. 브리핑 생성 정상 동작 확인 (Day 21 검증)
3. 이상 없으면 Phase 2 진행

### Phase 2 — 본인 번호 1회 실제 발신 테스트

> ⚠️ 이 단계부터 실제 전화가 걸린다. 조용한 곳에서 테스트할 것.

**설정 변경:**
```bash
# .env.local (로컬에서만 테스트)
ENABLE_REAL_CALLS=true
```

**테스트 절차:**
1. 부모님 프로필 → 전화번호를 **본인의 다른 번호**(예: 공기계)로 임시 설정
2. `/dashboard/calls` → 일정 선택 → 안부전화 미리보기 생성
3. **Mock 전화 실행** 클릭
4. 몇 초 후 해당 번호로 실제 전화가 걸려옴
5. 전화 받아서 안내 음성 확인
6. 1(완료) / 2(도움요청) / 3(나중에) 중 하나 입력
7. 대시보드에서 응답 반영 확인
8. 브리핑 탭 생성 확인

**성공 기준:**
- [ ] 전화 실제로 걸림
- [ ] 안내 음성이 call_script 내용과 일치
- [ ] DTMF(1/2/3) 입력이 대시보드에 반영
- [ ] Webhook 수신 후 care_call_attempts 상태 업데이트
- [ ] 브리핑 자동 생성

### Phase 3 — 3회 반복 안정성 테스트

1. 3가지 응답 각각 1회씩 테스트: 완료(1) / 도움요청(2) / 무응답(전화 안 받음)
2. 무응답의 경우 `no_answer` 상태 자동 처리 확인
3. 브리핑: 완료/도움요청은 생성, 무응답은 미생성 확인

### Phase 4 — Vercel 프로덕션 배포 테스트

> ⚠️ 프로덕션 배포 전 사용자 동의 (`consent_status = consent_granted`) 확인 필수.

1. Vercel 환경변수에 `ENABLE_REAL_CALLS=true` 추가
2. 실제 부모님 또는 동의한 가족 번호로 1회 테스트
3. 결과 확인 후 `ENABLE_REAL_CALLS=false`로 복구 (기본 안전 상태 유지)

---

## 4. 에러 대응 매뉴얼

| 에러 코드 | 원인 | 해결 방법 |
|---------|------|---------|
| Solapi 1011 | 발신번호 = 수신번호 | 수신번호를 다른 번호로 변경 |
| Solapi 2007 | 발신번호 미등록 | Solapi 대시보드에서 발신번호 승인 요청 |
| Solapi 4000 | 잔액 부족 | Solapi 계정 충전 |
| Webhook 수신 안됨 | Solapi에 webhook URL 미등록 | Solapi 대시보드 → 알림 URL에 `{배포URL}/api/voice/solapi-status` 등록 |
| 음성 내용 이상 | TTS 발음 문제 | call_script에서 숫자/영문 한글 표기로 교체 |
| 전화 즉시 끊김 | 수신 차단 설정 | 수신 번호의 스팸 차단 해제 |

---

## 5. 테스트 완료 후 체크리스트

- [ ] `ENABLE_REAL_CALLS` 기본값 `false`로 복구 확인
- [ ] 테스트용 임시 전화번호를 부모님 프로필에서 원래대로 변경
- [ ] 테스트 call_attempts 기록이 DB에 남아있는지 확인 (삭제 불필요 — 기록 보존)
- [ ] Solapi 사용 비용 확인 (Voice 1회 발신당 약 10원)

---

## 6. 이후 확장 트랙 (Day 25 이후)

Day 25가 성공하면 아래 항목을 순서대로 진행:

1. **Kakao 알림톡 연동** — 사업자등록번호 발급 후 카카오 비즈니스 채널 생성 → 알림톡 실제 발송 테스트
2. **AI 실시간 대화형 전화 (Level 3)** — Vapi/Retell/OpenAI Realtime 중 하나로 자유대화 전화 실험
3. **자동 발신 스케줄러** — cron으로 `care_call_schedules`의 예약 시간에 맞춰 자동 전화 발신

---

## 7. 절대 금지 규칙

- 동의 없는 부모님 실제 번호에 실제 전화 금지
- `consent_status = test_only` 상태의 번호는 테스트 환경에서만 사용
- API key/Secret을 채팅/커밋/문서에 절대 기록 금지
- `ENABLE_REAL_CALLS=true`를 기본값으로 커밋 금지
