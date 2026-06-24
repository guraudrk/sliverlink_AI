# Work Log: SilverLink AI – Web Input Channel

작업(테스크/슬라이스)이 끝날 때마다 아래에 새 섹션을 추가한다. 최신 항목이 위로 오도록 역순으로 쌓는다.

각 항목에는 **🤖 AI 활용 팁**(이 프로젝트뿐 아니라 다른 프로젝트에서도 쓸 수 있는, AI와 협업하며 얻은 일반화 가능한 노하우)을 포함한다.
이 파일은 추후 별도 일지(다이어리) 파일로 재구성될 예정이므로, 단순 변경 목록보다 "왜 그렇게 했는지 / 무엇을 깨달았는지"가 드러나게 작성한다.

---

## 2026-06-24 — 성능 테스트: Pretendard 폰트 전송량 실측

**계기**: "성능 테스트는 어떻게 하나"라는 질문에 방법론만 설명하는 대신, 방금 추가한 Pretendard 폰트가 실제로 얼마나 무거운지 그 자리에서 측정해서 숫자로 보여줌.

**방법**: Playwright로 dev 서버에 접속한 뒤, 브라우저의 Navigation Timing API(`performance.getEntriesByType('navigation')`)와 Resource Timing API(`performance.getEntriesByType('resource')`)를 `page.evaluate()`로 읽어 로드 시각, 전체 리소스 전송량, 리소스별(특히 폰트) 전송량을 집계. Lighthouse 같은 풀 오디트 도구 없이도, "지금 이 페이지가 실제로 몇 KB를 받는가"는 이 정도로 충분히 확인 가능.

**결과**:
- 페이지 전체 전송량 약 2,861KB 중 `PretendardVariable.woff2` 단독이 2,010KB (전체의 약 70%)
- DOMContentLoaded 약 59ms, Load 약 220ms (로컬 dev 기준 — 폰트는 `font-display: swap`이라 텍스트 렌더링을 막지는 않음)

**판단**: weight별 정적 파일(Regular/SemiBold/Bold...)로 바꾸면 오히려 더 커짐 — 한글 폰트는 weight 1개당 전체 한글 글리프(1만 1천여 자)를 다시 포함하므로, weight 수만큼 용량이 곱연산됨. 지금 쓰는 Variable 폰트(모든 weight를 1개 파일에 포함)가 이미 더 효율적인 선택. 진짜로 줄이려면 유니코드 레인지 기반 동적 서브셋(자주 쓰는 한글 음절만 우선 로드)이 필요한데, 이건 `next/font/local`의 기본 API 밖이라 추가 작업이 필요함. 이번 MVP는 내부용 채널(자녀/관리자 한정 접근)이고 폰트는 브라우저가 캐싱하므로 최초 1회만 비용이 발생 — 지금 단계에서는 수용 가능한 트레이드오프로 판단하고 보류. 트래픽이 늘거나 모바일 데이터 환경이 중요해지면 서브셋 적용을 권장.

**AI 활용 팁**: "성능을 어떻게 테스트하느냐"는 질문에는 방법만 듣기보다, AI에게 "방법 알려주고 지금 이 프로젝트에 직접 한번 돌려봐"라고 요청하는 게 훨씬 실용적이다. 추상적 설명보다 실측 숫자가 훨씬 빨리 의사결정으로 이어지고, 그 과정에서 직접 요청하지 않은 잠재적 문제(이번엔 2MB 폰트)를 덤으로 발견하는 경우가 많다. 다만 측정값은 "지금 환경(로컬 dev, 캐시 없음)" 기준이라는 점을 함께 기록해둬야, 나중에 프로덕션 수치와 헷갈리지 않는다.

**변경 파일**: 없음 (측정만 수행, 코드 변경 없음)

**커밋**: 대상 없음 (기록용 — 코드 변경이 없어 커밋할 diff가 없음)

---

## 2026-06-24 — Slice 3 후속 수정: 폼 톤을 4050세대 대상 "보기 편하고 세련된" 톤으로 재조정

**계기**: 사용자가 Slice 3의 "실버케어 따뜻한 톤"(stone/amber 팔레트)을 보고, 이 페이지의 실제 사용자는 어르신이 아니라 **자녀/관리자(4050세대)**이므로 "보기 편하면서도 세련된" 인상이 더 중요하다고 피드백.

**리서치**: Pretendard 폰트는 Apple 시스템 폰트 느낌을 재현해 가독성과 심미성이 모두 높다는 평가를 받으며, 2024년부터 대한민국 정부 범정부 UI/UX 디자인 시스템의 기본 서체(Pretendard GOV)로 채택될 만큼 한국 웹/앱 디자인의 사실상 표준이 됨 — [나무위키: Pretendard](https://namu.wiki/w/Pretendard), [GitHub: orioncactus/pretendard](https://github.com/orioncactus/pretendard). 40대 이상 사용자는 UI에서 '신뢰'와 '안정감'을 중시한다는 경향도 확인 — [10대가 게임할 때 60대는 '계산'…세대별 앱 사용 '제각각'](https://v.daum.net/v/20260331161701374).

**변경**:
- 폰트: `next/font/google`의 Geist Sans → `pretendard`(npm) 패키지의 Variable 폰트를 `next/font/local`로 자체 호스팅 (`weight: "45 920"`, CDN 의존 없이 빌드에 포함). Geist Mono는 JSON 미리보기용으로 유지.
- 색상: 따뜻한 중성색(`stone`)+오렌지(`amber`) → 차분한 한색 계열(`slate`)+신뢰감 있는 블루(`blue-600/700`, 국내 핀테크/서비스 앱에서 흔히 쓰는 "토스 블루" 계열 톤)로 전면 교체. 성공/실패는 기존 `emerald`/`rose` 유지.
- `globals.css`의 다크모드 대응 블록 제거 — 페이지가 명시적 라이트 톤(`slate-50`)으로 고정되어 있어, 어설픈 다크모드 대응이 오히려 불일치를 유발하므로 제거.
- `metadata`(title/description)를 boilerplate("Create Next App")에서 실제 서비스명으로 교체.

**시각 검증 방법**: Playwright(`chromium`, 이미 devDependency로 설치돼 있어 별도 설치 없이 사용 가능)로 dev 서버를 스크린샷 — 폼 기본 상태, 제출 후 성공 배너 + 최근 요청 목록 + 응답 미리보기까지 한 화면에서 시각적으로 확인. 결과: Pretendard 렌더링 깨끗함, blue/slate 조합이 의도한 대로 차분하고 신뢰감 있는 인상.

**검증**: `tsc --noEmit`/`eslint .`(0 에러)/`vitest run`(15/15)/`npm run build`(로컬 폰트 정상 로드) 모두 통과.

**변경 파일**: `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`, `src/components/task-request-form.tsx`, `package.json`/`package-lock.json`(`pretendard` 의존성 추가)

**AI 활용 팁**: 타깃 사용자를 구체적으로 짚어주면("시니어"가 아니라 "시니어의 자녀인 4050세대") AI가 완전히 다른 디자인 방향을 제시한다. "톤을 바꿔줘"보다 "어떤 사용자가 어떤 인상을 받았으면 좋겠는지"를 말해주는 게 훨씬 효과적이었다. 또한 AI에게 직접 스크린샷을 찍어 보여달라고 요청하면, 텍스트로 디자인을 설명받는 것보다 피드백 루프가 훨씬 빨라진다(이미 Playwright가 설치돼 있다면 추가 설치 없이 바로 가능).

**커밋**: 아직 안 함

---

## 2026-06-24 — Slice 3: 웹 입력 폼 UI 구현 (task 4.0)

**목표**: PowerShell 없이 브라우저에서 직접 요청을 입력할 수 있는 자녀/관리자용 웹 입력 폼 UI 구현.

**내용**:
- `src/components/task-request-form.tsx` (client component, 신규 작성):
  - 입력 필드: `sender_name`(텍스트, 기본값 "자녀 테스트"), `target_person`(select, `schema.ts`의 `TARGET_PERSON_OPTIONS`를 그대로 재사용해 옵션 중복 정의 방지), `message`(textarea)
  - 제출 시 `fetch("/api/create-task", { method: "POST", ... })`로 3개 필드만 전송 (서버가 `source_channel`/`requested_at`/`today_date`를 부가)
  - `message`가 빈 값이면 프론트에서 제출 차단 + 인라인 에러
  - 제출 중 버튼 비활성화("전달하는 중...")
  - 성공/실패 상태를 색상 + 아이콘 + 텍스트로 함께 표시(색상 단독 의존 지양 — 접근성 리서치 반영)
  - 응답 전체(JSON)를 화면 하단에 `<pre>`로 미리보기
  - 최근 성공 요청 3개를 `localStorage`에 저장 — `useSyncExternalStore`로 구현 (아래 "기술적으로 흥미로웠던 부분" 참조)
- `src/app/page.tsx`: 기존 create-next-app 보일러플레이트 제거, 페이지 타이틀/설명 + `<TaskRequestForm />` 렌더링으로 교체

**UI 톤 리서치** (요구사항 10 — "따뜻하고 깔끔한 실버케어 톤"): 2026년 UI/UX 트렌드와 시니어 접근성 가이드를 웹 검색으로 확인.
- 2026년 트렌드: 쨍한 화이트보다 sand/stone/oatmeal 같은 따뜻한 중성색 계열, 디자인을 "정서적 케어의 수단"으로 보는 흐름 — [UI Color Trends to Watch in 2026](https://updivision.com/blog/post/ui-color-trends-to-watch-in-2026), [The Modern Color Palette: UI/UX Color Trends That Define 2026](https://recursion.software/blog/ui-color-trends-2026)
- 시니어 접근성: 큰 글씨, 충분한 명도 대비, 터치 영역 최소 48px, 상태 표현 시 색상에만 의존하지 말고 아이콘을 함께 — [UX Design for Seniors: Examples and Tips](https://www.eleken.co/blog-posts/examples-of-ux-design-for-seniors), [Elder-Friendly UI: Designing Accessible Digital Interfaces](https://www.aufaitux.com/blog/designing-elder-friendly-ui-interfaces/)
- 한국어 자료: 고대비, 색상 외 아이콘 병행, 접근성은 "선택이 아닌 필수" — [고령화 시대 시니어 사용자를 위한 디자인](https://ditoday.com/%EA%B3%A0%EB%A0%B9%ED%99%94-%EC%8B%9C%EB%8C%80%EC%97%90-%EB%96%A0%EC%98%A4%EB%A5%B4%EB%8A%94-%EC%83%88%EB%A1%9C%EC%9A%B4-%ED%83%80%EA%B9%83-%EC%8B%9C%EB%8B%88%EC%96%B4-%EC%82%AC%EC%9A%A9/)
- 적용: Tailwind 기본 팔레트 중 `stone`(따뜻한 중성색)을 배경/텍스트로, `amber-700`을 주요 액션 버튼(흰 텍스트와 AA 대비 확보)으로, `emerald`/`rose`를 성공/실패에 사용. 입력 필드는 `text-lg` + `py-3` 이상으로 터치 영역과 가독성 확보. 새 의존성(아이콘 라이브러리 등) 추가 없이 인라인 SVG로 체크/경고 아이콘 구현.

**기술적으로 흥미로웠던 부분**: `useEffect`에서 `setState`를 직접 호출해 localStorage를 읽는 1차 구현이 `eslint-plugin-react-hooks@7`의 신규 규칙 `set-state-in-effect`에 걸림. 단순 `eslint-disable` 대신, localStorage를 진짜 "외부 스토어"로 보고 `useSyncExternalStore`로 재구현 — 같은 탭에서 쓴 변경은 `storage` 이벤트가 안 뜨므로, `writeRecentRequest()`가 직접 리스너를 깨우는 방식으로 보완.

**검증**: `tsc --noEmit`/`eslint .`(0 에러)/`vitest run`(15/15, 변경 없음)/`npm run build` 모두 통과. dev 서버(`localhost:3000`)에 떠 있는 HTML을 curl로 확인해 한글 문구·기본값·select 옵션이 모두 정상 렌더링됨을 확인. 빌드된 `.next/static`·`.next/dev/static`에 webhook URL/변수명이 여전히 없음을 재확인.

**브라우저 확인**: `npm run dev` 후 `http://localhost:3000`에서 폼 동작 확인 가능 (사용자가 직접 시각적으로 확인 필요 — 자동화 도구로는 HTML 렌더링까지만 검증함).

**변경 파일**: `src/components/task-request-form.tsx`(신규), `src/app/page.tsx`, `tasks/tasks-web-input.md`(체크박스 갱신)

**AI 활용 팁**: "따뜻함", "세련됨" 같은 주관적인 톤 요구사항은 AI에게 "최신 트렌드를 검색해서 근거를 대줘"라고 명시하면, 감으로 고른 색이 아니라 출처가 있는 결정이 나온다(나중에 왜 그 색을 골랐는지 설명하기도 쉬워짐). 또한 AI가 작업 중 예상 못한 린트/타입 에러를 만났을 때, 곧바로 우회(disable)하지 말고 "왜 이 규칙이 생겼는지 이해하고 정석으로 풀어달라"고 요구하면 코드 품질이 한 단계 올라간다.

**커밋**: 아직 안 함

---

## 2026-06-24 — Slice 2 검증: 4개 항목 오류 점검 후 커밋

**목표**: Slice 2(POST /api/create-task) 구현이 끝난 뒤, 아래 4가지에 오류가 없는지 확인하고 문제 없으면 지금까지 작업을 커밋.

**점검 항목 및 결과**:
1. `message`가 비어 있으면 400 반환 — 다른 필드는 정상값으로 두고 단독 테스트, `too_small` 이슈로 400 확인. **문제 없음**.
2. `target_person`이 허용값이 아니면 400 반환 — 다른 필드는 정상값으로 두고 단독 테스트, `invalid_value` 이슈로 400 확인. **문제 없음**.
3. `SILVERLINK_DRY_RUN=true`이면 Make 미호출 — `make-client.ts`에서 `dryRun` 분기가 `fetch` 호출보다 먼저 실행되어 구조적으로 호출 불가함을 코드로 확인 + 실제 `.env.local`(DRY_RUN=true) 서버로 호출해 `{ ok:true, dryRun:true, payload }` 응답 재확인. **문제 없음**.
4. `MAKE_WEBHOOK_URL`이 프론트에 노출되지 않음 — `NEXT_PUBLIC_` 접두사 미사용, `env.ts`/`make-client.ts`는 `route.ts`(서버 전용 API Route)에서만 import, `"use client"` 컴포넌트 자체가 아직 없음, 빌드된 `.next/static`·`.next/dev/static`(브라우저로 서빙되는 정적 자산)을 grep해도 webhook URL 문자열/변수명이 전혀 없음. **문제 없음**.

**결론**: 4개 항목 모두 오류 없음 확인 → Slice 2 변경사항 전체를 커밋.

**AI 활용 팁**: 구현이 끝났다는 보고를 받자마자 바로 커밋하지 말고, 체크리스트(이번엔 4개 항목)를 명시적으로 주고 "이거 통과하면 커밋해"라고 시키면 AI가 빠짐없이 자가 검증하고, 그 결과가 로그로 남아 나중에 추적하기도 좋다.

**커밋**: `06be733` ("Implement Slice 2: POST /api/create-task route handler with Make webhook dry-run support") — `route.ts`/`env.ts`/`make-client.ts`(charset 수정 포함), `vitest.config.ts`(신규), `docs/work-log.md`(신규), `tasks-web-input.md` 체크박스 갱신.

---

## 2026-06-24 — Slice 2 후속 수정: API 응답 charset 누락으로 한글 깨짐

**증상**: 사용자가 Windows PowerShell `Invoke-RestMethod`로 `/api/create-task`를 호출했을 때 응답의 한글(`sender_name`, `target_person`, `message` 등)이 `ê¹ìë` 식으로 깨져서 출력됨.

**원인**: `NextResponse.json()`이 기본적으로 `Content-Type: application/json`만 설정하고 `charset`을 명시하지 않음. curl/브라우저는 charset이 없어도 JSON을 UTF-8로 간주하지만, Windows PowerShell 5.1의 `Invoke-RestMethod`/`Invoke-WebRequest`는 charset이 없으면 UTF-8이 아닌 인코딩(주로 ISO-8859-1)으로 응답 본문을 디코딩해 한글이 mojibake로 깨짐. 서버 버그는 아니지만 클라이언트 호환성을 위해 명시하는 것이 맞음.

**수정**: `src/app/api/create-task/route.ts`에 `jsonResponse()` 헬퍼를 추가해 모든 응답에 `Content-Type: application/json; charset=utf-8`을 명시. `NextResponse.json()` 대신 표준 `Response`를 직접 사용.

**검증**: `tsc --noEmit`/`eslint`/`vitest run`(15/15)/`npm run build` 모두 통과. `curl -i`로 응답 헤더에 `charset=utf-8`이 포함됨을 확인.

**변경 파일**: `src/app/api/create-task/route.ts`

**AI 활용 팁**: 버그를 보고할 때 "PowerShell에서 한글이 깨진다"처럼 증상과 사용한 도구(어떤 클라이언트, 어떤 명령)를 구체적으로 말해주면, AI가 "서버 버그"와 "클라이언트의 인코딩 추정 방식 차이"를 구분해서 진단할 수 있다. 증상만 보고 서버 코드를 의심 없이 고치기 시작하면 헛다리를 짚기 쉽다.

**커밋**: 아직 안 함

---

## 2026-06-24 — Slice 2: POST /api/create-task Route Handler + Make Webhook 클라이언트 (task 3.0, 일부 1.4/1.6)

**목표**: Next.js Route Handler로 `POST /api/create-task`를 만들고, Dry Run 모드에서 실제 Make Webhook을 호출하지 않도록 한다.

**내용**:
- `src/lib/silverlink/env.ts`: `getSilverLinkEnv()` — `MAKE_WEBHOOK_URL`, `SILVERLINK_DRY_RUN`(기본값 `true`, `"false"`만 false로 처리)을 읽어 반환. import 시점에 throw하지 않음 (DRY_RUN=true일 때는 URL이 없어도 정상 동작해야 하므로).
- `src/lib/silverlink/make-client.ts`: `sendToMakeWebhook(payload)` —
  - `dryRun=true`: 실제 fetch 없이 로그만 남기고 `{ ok: true, dryRun: true, payload }` 반환
  - `dryRun=false` + URL 없음: `{ ok: false, error: "missing_webhook_url" }` 반환
  - `dryRun=false` + 호출: `AbortController`로 10초 타임아웃, 실패/non-2xx 시 `{ ok: false, error: "webhook_request_failed" }`, 성공 시 `{ ok: true, dryRun: false }`
- `src/app/api/create-task/route.ts`: `POST` 핸들러 — `request.json()` → `buildSilverLinkPayload()`(Slice 1) 검증 실패 시 400 + `issues` → `sendToMakeWebhook()` 결과에 따라 200/500/502 분기. `MAKE_WEBHOOK_URL`은 응답 어디에도 포함하지 않음.

**Next.js 16.2.9 확인 사항**: `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`, `03-api-reference/03-file-conventions/route.md` 확인 — `POST(request: Request)` + `Response`/`NextResponse.json()` 표준 패턴이 그대로 적용됨, 이번 슬라이스에서 breaking change 영향 없음.

**수동 테스트 (dev 서버, 3개 환경 조합)**:
1. 기본 `.env.local`(`SILVERLINK_DRY_RUN=true`) → 정상 입력 시 200 `{ ok: true, dryRun: true, payload }`
2. 빈 `sender_name`/`message` + 허용 안 된 `target_person` → 400 `{ ok: false, error: "validation_failed", issues: [...] }`
3. `SILVERLINK_DRY_RUN=false` + `MAKE_WEBHOOK_URL=""` → 500 `{ ok: false, error: "missing_webhook_url" }`
4. `SILVERLINK_DRY_RUN=false` + 존재하지 않는 URL(`http://127.0.0.1:9/...`) → 502 `{ ok: false, error: "webhook_request_failed" }`

테스트 3·4는 실제 Make Webhook(.env.local의 운영 URL)을 호출하지 않도록 별도 포트(3001)의 임시 dev 서버에 환경변수를 오버라이드해서 진행했고, 종료 후 모두 정리함.

**검증**: `tsc --noEmit` 통과, `eslint .` 통과, `vitest run` 15/15 통과(기존 Slice 1 테스트, 변경 없음), `npm run build` 성공.

**건드리지 않음**: UI(`task-request-form.tsx`) — 다음 슬라이스 범위.

**변경 파일**: `src/lib/silverlink/env.ts`, `make-client.ts`, `src/app/api/create-task/route.ts`, `tasks/tasks-web-input.md`(체크박스 갱신)

**AI 활용 팁**: 외부 연동(웹훅 등)이 있는 기능은 처음부터 "Dry Run 모드"를 요구사항에 넣으면, AI와 함께 빠르게 반복 작업하면서도 실제 운영 시스템을 건드릴 걱정이 없다. 진짜 호출이 필요한 실패 케이스(URL 없음, 타임아웃 등)는 별도 포트의 임시 서버 + 가짜/빈 URL로 격리하도록 명시하면, 테스트 중 실수로 운영 webhook을 건드리는 사고를 막을 수 있다.

**커밋**: 아직 안 함 (사용자가 나중에 한 번에 커밋하기로 함)

---

## 2026-06-24 — 빌드/테스트 에러 수정 (커밋 전)

**내용**: `tasks-web-input.md`의 특정 테스크는 아니고, 현재 코드베이스 점검 중 발견한 에러 2건 수정.

1. **Vitest가 Playwright e2e 스펙을 잘못 실행**
   - 증상: `npx vitest run` 시 `tests/e2e/create-task.spec.ts`(Playwright용 빈 placeholder)를 vitest 기본 글롭이 집어서 "No test suite found" 실패.
   - 수정: `vitest.config.ts` 신규 생성, `include: ["src/**/*.test.ts", "src/**/*.test.tsx"]`, `exclude: ["node_modules", "tests/e2e/**"]`로 범위 분리.
2. **`npm run build` 타입체크 실패**
   - 증상: `src/app/api/create-task/route.ts`가 빈 파일(0바이트)이라 Next.js 16.2.9 typed-routes 검증기가 "is not a module"로 빌드 실패.
   - 수정: 최소 placeholder(`export {}` + "task 3.0 구현 전" 주석)로 모듈화. 실제 핸들러 로직은 아직 구현하지 않음 (task 3.0에서 진행).

**검증**: `tsc --noEmit` 통과, `eslint .` 통과, `vitest run` 15/15 통과, `npm run build` 성공.

**변경 파일**: `vitest.config.ts`(신규), `src/app/api/create-task/route.ts`

**AI 활용 팁**: "기능 구현해줘"만 시키면 놓치기 쉬운 "하네스 자체의 결함"(테스트 러너 설정, 빌드 설정 등)은 "에러 있는지 확인해줘"처럼 열린 질문을 주기적으로 던져야 드러난다. 기능 요청과 별개로, 가끔 전체 점검을 시키는 습관이 누적된 잡버그를 줄여준다.

**커밋**: 아직 안 함 (사용자가 나중에 한 번에 커밋하기로 함)

---

## 2026-06-23 — Slice 1: 입력 스키마와 payload 생성 로직 구현 (tasks 2.0, 5.1–5.2)

**목표**: SilverLink 웹 입력 payload의 스키마와 payload 생성 로직 작성.

**내용**:
- `src/lib/silverlink/schema.ts`: Zod로 사용자 입력 스키마(`taskRequestInputSchema`: `sender_name`/`target_person`/`message`)와 최종 payload 스키마(`taskRequestPayloadSchema`: 위 3개 + `source_channel` literal `"web"` + `requested_at` ISO datetime(+09:00) + `today_date` `YYYY-MM-DD`) 정의. `target_person`은 `"아버지 테스트" | "어머니 테스트"`만 허용.
- `src/lib/silverlink/time.ts`: `Intl.DateTimeFormat(timeZone: "Asia/Seoul")` 기반으로 서버 로컬 타임존과 무관하게 `requested_at`/`today_date`를 생성하는 `getRequestedAt()`, `getTodayDate()` 작성.
- `src/lib/silverlink/payload.ts`: `buildSilverLinkPayload(input, now?)` — 입력 검증 + 시간 생성 + `source_channel: "web"` 고정값을 합쳐 최종 payload를 만드는 순수 함수. `now`를 주입할 수 있어 테스트에서 시간을 고정 가능.
- 유닛 테스트 15건 작성 (`schema.test.ts`, `payload.test.ts`): 정상 입력 통과, 필수값 누락/빈 문자열 실패, `target_person` 허용값 검증, `source_channel`이 항상 `"web"`인지 등.
- 부수 수정: `package.json`에 중복으로 존재하던 `scripts` 키 두 개를 하나로 병합 (버그). `zod`/`vitest`/`playwright`/`jsdom` 의존성 확인.

**의도적으로 단순화한 부분** (추후 슬라이스에서 보강 가능):
- `sender_name`/`message` 최대 길이 제한 없음.
- `source_channel`을 `kakao` 확장용 union이 아닌 `"web"` literal로만 구현 (YAGNI, 카카오 채널 도입 시점에 확장).

**건드리지 않음**: UI(`task-request-form.tsx`), API Route(`app/api/create-task/route.ts`) — 다음 슬라이스 범위.

**검증**: `vitest run` 15/15 통과, `tsc --noEmit` 통과.

**변경 파일**: `src/lib/silverlink/schema.ts`, `time.ts`, `payload.ts`, `src/lib/silverlink/__tests__/schema.test.ts`, `payload.test.ts`, `package.json`, `tasks/tasks-web-input.md`(체크박스 갱신)

**AI 활용 팁**: PRD/태스크 문서를 먼저 만들게 하고 "Go라고 입력하면 다음 단계로 넘어가겠다" 같은 명시적 체크포인트를 두면, AI가 한꺼번에 너무 많은 걸 구현해버리는 걸 막고 매 단계마다 방향을 확인할 수 있다. 슬라이스(Slice) 단위로 "이번에 수정/생성할 파일 목록"을 프롬프트에 못박아주는 것도 범위가 새는 걸 막는 데 효과적이었다.

**커밋**: `a4dab07` (브랜치 `feature/web-input-channel`)
