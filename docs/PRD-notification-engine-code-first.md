# PRD: Notification Preparation Engine (Code-First) — Day 5

## 0. 문서 정보
- 상태: Draft (확정 전, 가정 포함 — 검토 필요)
- 작성일: 2026-06-25
- 범위: "due task 감지 → outbound 메시지 초안 생성 → care_tasks 패치 미리보기"까지를 **Next.js 코드베이스 안에서** 구현하고 검증한다.
- 선행 문서: [`docs/PRD-web-input.md`](./PRD-web-input.md) (Day 4 — 웹 입력 채널 MVP)

> **Day 5 목표**: 실제 발송이 아니라, **알림 준비 로직을 코드로 검증하는 것**이다. Make 호출, 카카오톡 발송, 실제 부모님(어르신) 데이터 사용은 전부 이번 범위에서 제외한다.

## 1. 목적

Day 4에서 웹 입력 → Make Webhook → GPT 파싱 → Airtable `care_tasks` 생성 → `message_logs` inbound 기록까지의 파이프라인을 완성했다. 그 다음 단계로 Day 4 PRD의 "다음 단계로 분리한 범위"에 있던 항목들 —
`due_task_checker`, `message_logs` outbound 기록, `parent_notified` 업데이트, 카카오톡 알림 발송, 부모님 "완료" 응답 처리 — 을 구현해야 한다.

Day 5의 목적은 이 중에서 **"판단하고 준비하는" 로직**(어떤 케어 업무가 지금 알림을 보낼 때가 됐는지, 어르신께 어떤 문구를 보낼지, `care_tasks`를 어떻게 갱신할지)을 먼저 Next.js 코드로 만들고, 로컬 fixture 데이터로 충분히 검증하는 것이다. 실제로 메시지를 보내거나 외부 시스템에 쓰는 "실행" 단계는 이후 챕터(12장)로 미룬다.

## 2. 왜 Make 사용을 줄이는지

- Make.com은 시나리오 실행(operation) 단위로 사용량이 제한/과금되는 구조다. Day 4에서도 실제 연동을 확인하기 위해 `SILVERLINK_DRY_RUN=false`로 몇 차례 실제 호출을 했는데, 개발·테스트 중 이런 호출이 반복되면 크레딧이 빠르게 소진된다.
- Make 시나리오 내부의 분기/조건 로직은 유닛 테스트를 작성할 수 없고, 버전 관리(diff, 코드 리뷰)도 어렵고, 디버깅도 Make의 실행 이력(History) UI에 의존해야 한다. 반면 같은 로직을 Next.js 코드로 작성하면 Day 4와 동일하게 Vitest로 빠르게(15개 테스트가 0.3초) 반복 검증할 수 있다.
- 따라서 "판단/생성"(어떤 작업이 알림 대상인지, 무슨 문구를 보낼지, 무엇을 갱신할지)은 **코드에서 결정**하고, Make는 향후 "실행"(실제 Kakao 발송, Airtable 쓰기) 트리거 역할만 최소한으로 맡기는 방향으로 책임을 분리한다. 이 분리 덕분에 Day 5는 Make 호출 없이도 전체 의사결정 로직을 끝까지 검증할 수 있다.

## 3. Day 5 구현 범위

- 로컬 fixture로 `care_tasks` 레코드 형태의 입력 데이터 모델 정의 (5장)
- due task 판단 로직 — 순수 함수, 유닛 테스트로 검증 (6장)
- outbound 메시지 후보 생성 로직 — 템플릿 기반, GPT/Make 미사용 (7장)
- `care_tasks` update patch 미리보기 생성 로직 (8장)
- Dry Run 전용 API 라우트 — fixture 데이터 기반, 외부 호출 없음 (9장)
- 관리자용 preview 화면 — 위 결과를 눈으로 확인 (10장)
- 유닛 테스트 (+ 가능하면 Playwright E2E) (11장)

> 참고(가정, Go 이후 tasks 단계에서 확정): 모듈은 Day 4의 `src/lib/silverlink/` 네이밍 관례를 따라 `src/lib/notification-engine/`에 두고, API는 `src/app/api/notification-engine/preview/route.ts`, 관리자 화면은 `src/app/admin/notifications/page.tsx` 정도의 위치를 예상한다. 정확한 경로는 tasks 문서에서 확정한다.

## 4. Day 5에서 하지 않을 것

- **Make를 호출하지 않는다.** (개발 중 어떤 시나리오도 트리거하지 않음)
- **카카오톡을 호출하지 않는다.** (Kakao API/Alimtalk 연동 없음)
- **실제 메시지를 발송하지 않는다.** (어르신께 전달되는 모든 메시지는 "미리보기"에서 멈춤)
- **실제 부모님(어르신) 데이터를 사용하지 않는다.** 로컬 fixture 데이터만 사용한다.
- **Airtable를 실제로 읽거나 쓰지 않는다.** (`care_tasks` 조회/갱신 모두 fixture 기반 시뮬레이션)
- `due_task_checker`를 주기적으로 실행하는 스케줄러(cron 등) 연동은 하지 않는다. Day 5는 "판단 로직 자체"만 만들고, 그 로직을 언제·어떻게 주기적으로 호출할지는 향후 과제(12장)다.
- `parent_notified`, `message_logs` outbound 등 실제 데이터 갱신은 하지 않는다 — patch는 항상 "이렇게 바뀔 것"이라는 미리보기로만 존재한다.

## 5. 입력 데이터 구조

Day 5는 Airtable `care_tasks` 테이블의 실제 스키마를 아직 확인하지 않은 상태이므로, Day 4 PRD/구현에서 이미 쓰던 필드(`sender_name`, `target_person`, `message`, `source_channel`, `requested_at`, `today_date`)에 알림 준비에 필요한 필드를 더해 **가정한 형태**로 fixture를 만든다.

```ts
type CareTask = {
  id: string;                                  // Airtable record id에 대응 (fixture에서는 임의 문자열)
  sender_name: string;                         // Day 4 입력자
  target_person: "아버지 테스트" | "어머니 테스트";
  message: string;                             // 원본 요청 메시지 (Day 4 inbound)
  category: "건강확인" | "복약" | "병원" | "안부" | "기타"; // GPT가 분류했다고 가정한 값 (fixture에서는 수동 지정)
  due_at: string;                              // ISO datetime(+09:00) — 알림을 보내야 하는 기준 시각
  status: "pending" | "completed";             // 어르신 쪽 완료 응답 여부 (Day 5 범위 밖이지만 모델엔 존재)
  parent_notified: boolean;                    // 이미 어르신께 알림이 발송됐는지
  source_channel: "web" | "kakao";
  requested_at: string;                        // Day 4에서 생성된 원본 입력 시각
  today_date: string;
};
```

> ⚠️ 가정: `category`/`due_at`/`status`/`parent_notified` 필드명과 값 종류는 실제 GPT 파싱 결과·Airtable 스키마와 다를 수 있다. 추후 Airtable 연동 시(12장) 실제 스키마에 맞춰 조정한다.

fixture 데이터셋은 최소한 다음 케이스를 포함해야 한다(11장 테스트 케이스와 1:1 대응):
- 기한이 지났고 아직 알림 안 보낸 task (due 후보)
- 기한이 아직 안 된 task (제외 대상)
- 이미 알림을 보낸 task (`parent_notified: true`, 제외 대상)
- 이미 완료된 task (`status: "completed"`, 제외 대상)
- `target_person`이 다른 여러 건 (아버지/어머니 혼합)

## 6. due task 판단 조건

다음 조건을 **모두** 만족하면 "지금 알림을 보낼 후보"로 판단한다.

1. `status !== "completed"` — 이미 완료된 업무는 대상이 아니다.
2. `parent_notified === false` — 이미 알림을 보낸 업무는 다시 후보가 되지 않는다.
3. `due_at <= now` (Asia/Seoul 기준 현재 시각) — 기한이 도달했거나 지났다.

조건을 만족하는 task는 `due_at`이 오래된 것부터(가장 많이 지연된 것 우선) 정렬해 반환한다. 판단 함수는 `now`를 인자로 주입받아야 한다(Day 4의 `buildSilverLinkPayload(input, now?)`와 동일한 패턴) — 그래야 테스트에서 시각을 고정해 결정론적으로 검증할 수 있다.

## 7. outbound message 후보 구조

```ts
type OutboundMessageCandidate = {
  task_id: string;
  target_person: string;
  channel: "kakao";          // 향후 확장을 위한 필드. Day 5에서는 어떤 채널로도 실제 전송하지 않는다.
  message_text: string;      // 템플릿 기반으로 생성된 문구
  generated_at: string;      // 미리보기를 생성한 시각 (ISO, Asia/Seoul)
  status: "draft";           // Day 5에는 "초안" 상태만 존재 (발송/완료 상태 없음)
};
```

`message_text`는 GPT를 호출하지 않고, **코드 안의 결정적 템플릿**으로 만든다. 예:
> "{target_person}, {sender_name}님이 '{message}' 라고 안부를 전해달라고 하셨어요."

카테고리(`category`)별로 톤이 살짝 다른 템플릿을 둘 수 있으나, Day 5에서는 가장 단순한 단일 템플릿으로 시작하고 필요해지면 카테고리 분기를 추가한다(YAGNI).

## 8. care_tasks update patch 구조

실제로 Airtable에 쓰지는 않지만, "만약 지금 실행한다면 무엇이 바뀔지"를 명시적으로 보여주는 미리보기 구조다.

```ts
type CareTaskPatchPreview = {
  task_id: string;
  patch: {
    parent_notified: true;
    notified_at: string;     // 알림이 발송된(될) 시각
  };
  reason: string;            // 왜 이 패치가 제안됐는지 (6장의 판단 사유, 리뷰/디버깅용)
};
```

`due task 판단(6장)` → `outbound 후보 생성(7장)` → `patch 미리보기(8장)`는 한 번의 호출로 함께 만들어지는, 서로 1:1로 짝지어진 결과물이다.

## 9. Dry Run API 설계

- `GET /api/notification-engine/preview`
  - 쿼리 파라미터: `now`(선택, ISO datetime) — 테스트/시연 시 "현재 시각"을 고정하기 위함. 없으면 실제 현재 시각(Asia/Seoul) 사용.
  - 동작: fixture 데이터 로드 → 6장 판단 → 7장 후보 생성 → 8장 패치 미리보기 생성 → 응답.
  - 응답 예시:
    ```json
    {
      "ok": true,
      "dryRun": true,
      "checkedAt": "2026-06-25T09:00:00+09:00",
      "dueTasks": [ /* CareTask[] */ ],
      "outboundCandidates": [ /* OutboundMessageCandidate[] */ ],
      "patchPreviews": [ /* CareTaskPatchPreview[] */ ]
    }
    ```
- 이 API는 **항상 dry-run이다.** Day 5에는 "실제로 실행하는" 경로 자체가 없으므로 Day 4의 `SILVERLINK_DRY_RUN` 같은 on/off 스위치는 아직 필요 없다. 응답에 `dryRun: true`를 고정값으로 포함해, Day 4의 응답 형태(`{ ok, dryRun, payload }`)와 패턴을 일관되게 유지한다.
- 외부 호출(Make/Kakao/Airtable)이 전혀 없으므로 인증 없이도 안전하지만, 관리자 전용 데이터이므로 실제 배포 전에는 접근 제어가 필요하다 — Day 5에서는 미구현, 오픈 이슈로 남긴다.

## 10. 관리자 preview UI 설계

- 새 라우트: `/admin/notifications` (가정 경로, tasks 단계에서 확정)
- 화면 구성:
  - "지금 기준으로 다시 확인" 버튼 — 9장 API를 호출해 최신 결과를 가져온다.
  - **알림 대상 목록**: due task별로 카드 형태로 표시 (대상자, 원본 요청, 기한, 지연 시간 등)
  - 각 카드 안에 **outbound 메시지 초안**과 **care_tasks 패치 미리보기**를 함께 표시 (Day 4의 "응답 미리보기" `<pre>` 패턴 재사용 가능)
  - 실제 "발송" 또는 "적용" 버튼은 **두지 않는다.** 화면 상단에 "이 화면은 미리보기 전용이며 실제로 발송/저장되지 않습니다"라는 안내 문구를 명시한다.
- 디자인 톤은 Day 4와 동일하게 유지한다 — Pretendard 폰트, slate/blue 팔레트(4050세대 관리자가 보기 편하고 신뢰감 있는 톤으로 이미 검증됨).

## 11. 테스트 케이스

**유닛 테스트 (Vitest)** — due task 판단/메시지 생성/패치 생성 로직 대상:
1. 기한이 지났고 `parent_notified: false`인 task는 due 후보에 포함된다.
2. 기한이 아직 안 된 task는 후보에서 제외된다.
3. `parent_notified: true`인 task는 후보에서 제외된다(중복 알림 방지).
4. `status: "completed"`인 task는 후보에서 제외된다.
5. 여러 후보가 있을 때 `due_at`이 오래된 순으로 정렬된다.
6. outbound 메시지 템플릿에 `target_person`/`sender_name`/`message`가 정확히 반영된다.
7. patch 미리보기에 `parent_notified: true`와 `notified_at`이 올바르게 포함된다.
8. `now`를 주입했을 때 판단 결과가 그 시각 기준으로 결정론적으로 나온다(고정된 fixture + 고정된 `now` → 항상 같은 결과).

**E2E 테스트 (Playwright, 가능하면)**:
9. 관리자 preview 화면 진입 시 fixture 기반 결과가 정상적으로 렌더링된다.
10. "실제 발송" 버튼이 화면에 존재하지 않는다(혹은 비활성화 안내만 존재) — 실수로 실제 발송 기능을 노출하지 않았는지 확인하는 안전장치성 테스트.

## 12. 향후 Airtable/Make/Kakao 연결 계획

Day 5에서 검증한 로직(6~8장)은 그대로 재사용하고, 데이터 소스와 실행 단계만 교체하는 방향으로 확장한다.

- **Airtable 연동**: fixture 대신 Airtable API로 `care_tasks`를 직접 읽고(Make를 거치지 않고 코드에서 직접 호출해 크레딧 절약), 패치 미리보기를 실제 PATCH 요청으로 전환. Day 4의 `MAKE_WEBHOOK_URL` 패턴처럼 `AIRTABLE_API_KEY`/`AIRTABLE_BASE_ID` 등을 서버 전용 환경변수로 추가.
- **Kakao 연동**: outbound 메시지 후보를 실제 카카오 알림톡/비즈메시지 API(또는 Make의 Kakao 모듈)로 전송. Day 4의 `SILVERLINK_DRY_RUN`과 동일한 패턴으로 `KAKAO_DRY_RUN` 같은 안전 스위치를 먼저 도입한 뒤에만 실제 발송을 허용.
- **Make 역할 재정의**: 읽기/판단은 코드가 전담하고, Make는 (필요하다면) 카카오 발송이나 알림 이력 기록처럼 운영팀이 Make UI에서 모니터링하고 싶어하는 "실행" 단계에만 최소한으로 남긴다.
- **`message_logs` outbound 기록**: 실제 발송 성공/실패 시 outbound 로그를 Airtable `message_logs`에 기록 (Day 4의 inbound 기록과 대칭되는 구조).
- **부모님(어르신) "완료" 응답 처리**: 어르신이 카카오톡으로 응답하면 이를 받아 `status: "completed"`로 갱신하는 별도 웹훅/입력 채널 필요 — Day 4의 웹 입력 채널과는 반대 방향(어르신 → 시스템)의 입력 경로이므로 별도 PRD로 분리할 가능성이 높다.
- **중복/멱등성**: 같은 task가 여러 번 due 판단에 걸려 중복 발송되지 않도록, 실제 발송 단계에서는 멱등키(idempotency key) 또는 발송 시도 락(lock) 설계가 필요 — Day 5의 `parent_notified` 플래그가 1차 방어선이지만, 동시 실행(같은 task_checker가 겹쳐 실행되는 경우) 대비책은 추후 보강.
