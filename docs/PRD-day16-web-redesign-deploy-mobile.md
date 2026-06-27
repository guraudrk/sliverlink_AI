# SilverLink AI — Day 16: 웹 개편(모바일 최적화) + 배포 (PRD)

## 0. 문서 정보

- 사용자가 정한 남은 로드맵 순서: **4(이 문서) → 3(Resend 도메인 인증) → 5(실제 통화/SMS/카카오 발송)**.
- 이번 Day의 범위: **(1) 브랜드 아이콘(파비콘류) (2) 모바일 웹(Chrome) 사용성 최적화 (3) 배포**. 앱(네이티브/PWA 설치형) 출시는 명시적으로 이번 범위에서 제외하고 가장 마지막으로 미룬다.

## 1. 목표

| # | 항목 | 한 줄 정의 |
|---|---|---|
| 1 | 브랜드 아이콘 | 브라우저 탭/주소창에 뜨는 아이콘(favicon)과 모바일 "홈 화면에 추가" 아이콘을 프로젝트 컨셉(돌봄·연결)에 맞게 직접 디자인 |
| 2 | 모바일 웹 최적화 | 네이티브 앱 없이, 모바일 Chrome에서 풀스크린으로 써도 불편함이 없는 수준으로 핵심 페이지를 점검·수정 |
| 3 | 배포 | Vercel에 실제로 배포해서 `localhost`가 아닌 실제 URL로 접근 가능하게 만들고, 이후 `git push`만으로 재배포되는 구조를 만든다 |

## 2. 결정한 것 (사용자 위임 후 객관적으로 판단)

### 2-1. 배포 플랫폼 — **Vercel**

후보: Vercel vs Docker/Railway. 사용자는 "둘 다 무료로 가능하니, 나중에 AI 에이전트(헤르메스류)를 적극 쓸 것까지 감안해서 판단해달라"고 위임함.

- **Next.js와의 적합도**: Vercel은 Next.js를 만든 회사가 운영하는 공식 검증 어댑터(Verified Adapter) — App Router의 Server Components/Route Handlers/Streaming/Edge Runtime 전부를 별도 설정 없이 지원. Docker/Railway로 가면 `output: "standalone"` 빌드 설정과 컨테이너 관리를 직접 해야 함.
- **"AI 에이전트 친화적"이라는 기준에서도 Vercel이 더 유리한 이유**: Vercel은 2024~2025년부터 **Fluid Compute**(AI/에이전트 워크로드를 겨냥해 만든 실행 모델 — 함수 인스턴스를 재사용해 콜드스타트를 줄이고, 기존 서버리스보다 훨씬 긴 실행 시간을 허용)를 무료 티어부터 제공한다. 향후 RAG 비서를 더 무겁게 쓰거나(Day14의 Function Calling을 확장) 장시간 실행되는 에이전트를 붙일 때, 일반 컨테이너를 직접 스케일링하는 것보다 Vercel의 관리형 모델이 손이 덜 간다.
- **결론**: Vercel로 진행. (전화처럼 정말 긴 시간 동안 소켓을 물고 있어야 하는 작업이 5단계에서 생기면, 그건 Vercel 메인 앱과 분리된 별도 워커로 빼는 게 정석이므로 이번 선택과 충돌하지 않음 — 5단계 착수 시 다시 판단)

### 2-2. 도메인 — **Vercel 무료 서브도메인을 "내 것처럼" 고른 이름으로**

후보: 무료 `*.vercel.app` 서브도메인 vs 진짜 무료 최상위 도메인(Freenom류). 사용자는 "무료인 걸로 하되 최대한 내 고유의 것처럼"이라고 요청.

- **진짜 무료 최상위 도메인(.tk/.ml/.ga 등)은 권장하지 않음**: 스팸/사기에 자주 쓰여 평판이 나쁜 도메인 풀이라, 이메일 발송 평판에 영향을 줄 수 있음 — 바로 다음 단계(3단계, Resend 도메인 인증)의 목적 자체가 "신뢰할 수 있는 도메인으로 메일 보내기"인데, 그걸 처음부터 깎아먹는 선택이라 모순됨.
- **대안**: Vercel 프로젝트 이름을 원하는 이름(예: `silverlink-ai`)으로 지정하면 `silverlink-ai.vercel.app`처럼 **온전히 내가 고른, 남이 안 쓰는 고유 주소**가 무료로 즉시 생긴다. 이건 진짜 무료이고, 평판 문제도 없고, 나중에 진짜 도메인(`.com`/`.kr` 등, 연 1만원대)을 사면 그때 그대로 연결만 갈아끼우면 된다.
- **결론**: `silverlink-ai.vercel.app`(또는 사용 가능한 가장 가까운 변형)으로 배포. 실 도메인 구매는 이번 범위 밖(필요해지면 별도 논의).

## 3. 브랜드 아이콘 설계

- 외부 이미지 파일 없이 **Next.js의 코드형 아이콘 생성**(`app/icon.tsx`, `next/og`의 `ImageResponse`)을 사용 — 이미지 에디터 없이 코드로 직접 디자인하고, 빌드 시 정적으로 캐시됨(`node_modules/next/dist/docs/.../app-icons.md` 확인).
- 컨셉: 기존 UI에서 이미 일관되게 쓰던 **블루 계열**(`blue-600`, 버튼/강조색)을 베이스로, "두 사람(가족)을 잇는 연결고리/하트" 모티프로 단순한 심볼을 그린다. 어르신 돌봄 + 가족 간 연결이라는 서비스 컨셉을 한눈에 떠올릴 수 있게.
- 만들 파일:
  - `src/app/icon.tsx` — 32x32 PNG, 브라우저 탭 아이콘(사용자가 말한 "유튜브 탭 아이콘" 자리)
  - `src/app/apple-icon.tsx` — 180x180 PNG, iOS "홈 화면에 추가" 아이콘
  - `src/app/manifest.ts` — PWA 매니페스트(설치형 앱은 아니지만, Android Chrome "홈 화면에 추가" 시 제목/아이콘/테마색이 제대로 나오게 함). `display: "standalone"`이지만 실제 앱 출시(스토어 배포 등)는 하지 않음 — 이 매니페스트는 모바일 웹 경험 개선 차원.
  - 기존 `src/app/favicon.ico`(Next 기본 템플릿 아이콘)는 `icon.tsx`로 대체되며 제거.

## 4. 모바일 웹 최적화 — 점검 대상 페이지

우선순위 순서(어르신/가족이 실제로 폰으로 열어볼 가능성이 높은 페이지부터):

1. **`/r/[token]`** — 어르신이 카카오톡/SMS 링크로 직접 여는 페이지. 로그인도 없고 가장 중요한 모바일 단일 진입점. 버튼 터치 영역, 글자 크기, 한 손 사용성을 최우선 점검.
2. **`/login`, `/signup`** — 첫 진입점. 입력 필드/키보드 겹침, Google 로그인 버튼 정렬.
3. **`/dashboard`(허브), `/dashboard/assistant`(채팅)** — 채팅 입력창이 모바일 키보드에 가려지지 않는지, 메시지 말풍선 폭, 빠른 질문 버튼 줄바꿈.
4. **`/dashboard/create-task`, `/dashboard/tasks`, `/dashboard/calls`, `/dashboard/parents`(+`[parentId]`), `/dashboard/responses`** — 폼/리스트/모달이 좁은 화면에서 가로 스크롤 없이 동작하는지.

점검 방법: 개발 서버를 띄운 뒤 Playwright로 모바일 뷰포트(iPhone 14, 375×812) 스크린샷을 찍어 직접 확인하고, 문제(가로 스크롤, 겹침, 너무 작은 터치 영역)를 고친 뒤 재스크린샷으로 재확인 — 코드만 보고 "될 것 같다"고 끝내지 않는다.

**제외(이번에 안 함)**: 네이티브 앱, 앱스토어 배포, 완전한 PWA 오프라인 지원(서비스워커 캐싱 전략 등) — 사용자가 명시적으로 "앱은 가장 나중"이라고 함.

## 5. 배포 작업

1. **사전 점검**: `next.config.ts`가 Vercel 기본 설정 그대로(특수 `output` 설정 없음) 호환되는지 확인 — 이미 확인됨, 별도 설정 불필요.
2. **레거시 코드 정리**: 어디서도 링크되지 않는 `/notifications`(Day8 이전 Airtable Mock 화면, `docs/work-log.md`에 이미 정리 대상으로 기록됨) + `/api/notifications/prepare` 제거.
3. **Vercel 프로젝트 생성(사용자 직접 진행)**: Vercel은 사용자 계정 로그인이 필요해 Claude Code가 대신할 수 없음 — 사용자가 vercel.com에서 GitHub 저장소(`guraudrk/sliverlink_AI`)를 Import. Claude Code는 정확한 클릭 순서와 입력값을 안내.
4. **환경변수 등록**: `.env.example`에 정리된 변수들(Supabase URL/anon key, `GEMINI_API_KEY` 등)을 Vercel 프로젝트 설정에 등록 — 값은 사용자가 직접 입력(비밀값을 Claude Code가 절대 보지 않음).
5. **Supabase/Google OAuth 리다이렉트 URL 갱신**: 배포된 `https://silverlink-ai.vercel.app` 주소를 Supabase Authentication → URL Configuration과 Google Cloud Console OAuth 클라이언트의 승인된 리다이렉트 URI에 추가(localhost 설정은 유지, 운영 주소를 추가).
6. **첫 배포 + 스모크 테스트**: 배포된 주소에서 로그인/회원가입/Google 로그인/대시보드 진입까지 직접 확인.
7. **README/work-log 갱신** + **별도 문서 `docs/deployment-guide.md` 작성**(재배포 방법, 환경변수 목록, 도메인/리다이렉트 설정 위치, 롤백 방법 등 — 다음에 배포 관련 문제가 생기면 바로 참고할 수 있는 운영 문서).

## 6. 작업 순서(슬라이스 단위, `tasks/tasks-day16-web-redesign-deploy-mobile.md`에서 체크)

1. 브랜드 아이콘(icon.tsx/apple-icon.tsx/manifest.ts) + 레거시 favicon 제거
2. `/notifications` 레거시 정리
3. 모바일 반응형 점검 + 수정(Playwright 스크린샷 기반, 페이지별)
4. 배포 사전 점검(env 변수 문서/redirect URL 안내 문서화)
5. 사용자의 Vercel 프로젝트 생성 + 배포 (사용자 직접 클릭, Claude Code는 안내)
6. 배포 후 스모크 테스트 + README/work-log/deployment-guide.md 작성

## 7. 다음 단계와의 연결

- 이번에 정한 `silverlink-ai.vercel.app` 주소는 3단계(Resend 도메인 인증)에서 그대로 쓰지 않는다 — Resend 도메인 인증은 **이메일 발신 도메인**(예: `mail.silverlink-ai.com`처럼 실제 보유 도메인의 서브도메인에 DNS 레코드를 추가하는 방식)이 필요해서, Vercel의 무료 서브도메인과는 별개 트랙이다. 3단계 착수 시 이 문제를 다시 짚고 간다.
