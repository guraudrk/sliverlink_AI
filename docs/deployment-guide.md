# 배포 가이드 (Vercel)

이 문서는 SilverLink AI를 Vercel에 배포·재배포하는 방법과, 배포 후 챙겨야 하는 설정(환경변수, OAuth 리다이렉트 URL)을 정리한 운영 문서입니다. 배포 관련 문제가 생기면 이 문서를 먼저 확인하세요.

**현재 운영 주소**: https://silverlink-ai.vercel.app (2026-06-27 최초 배포, Day16)

배경/결정 이유는 [`docs/PRD-day16-web-redesign-deploy-mobile.md`](PRD-day16-web-redesign-deploy-mobile.md) 2장 참고.

## 1. 배포 플랫폼

**Vercel** — Next.js 16(App Router)의 공식 검증 어댑터. GitHub 저장소(`guraudrk/sliverlink_AI`)를 연결해두면, 그 뒤로는 **`main` 브랜치에 `git push`만 하면 자동으로 재배포**됩니다(별도 배포 명령 불필요).

## 2. 최초 배포 절차 (1회만)

1. https://vercel.com 에서 GitHub 계정으로 로그인.
2. "Add New..." → "Project" → GitHub 저장소 `guraudrk/sliverlink_AI` Import.
3. Project Name을 `silverlink-ai`(또는 사용 가능한 가장 가까운 이름)로 지정 — 이게 곧 운영 주소(`https://<이름>.vercel.app`)가 됩니다. Framework Preset은 Next.js가 자동 감지됨.
   > ⚠️ **Project Name을 나중에 바꿔도 도메인은 자동으로 안 바뀝니다.** 처음 만들 때 GitHub 저장소 이름(`sliverlink_AI`, 오타 포함)을 그대로 제안받아 그게 도메인으로 굳어진 적이 있었음 — Settings → General에서 이름을 바꾼 뒤, Settings → Domains에서 기존 도메인의 "Edit"를 눌러 도메인 문자열도 같이 수동으로 바꿔야 함.
4. "Environment Variables"에서 아래 3장의 변수들을 등록(값은 `.env.local`에 있는 실제 값 — Vercel 대시보드에만 입력하고 어디에도 복사해 남기지 않기).
5. "Deploy" 클릭 → 빌드 로그에서 에러 없이 끝나는지 확인.
6. 배포 완료 후 4장(리다이렉트 URL)을 마무리해야 로그인이 정상 동작합니다.

## 3. 환경변수 (Vercel Project Settings → Environment Variables)

`.env.example` 기준, Production 환경에 등록해야 하는 변수:

| 변수 | 등록 필요? | 비고 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ 필수 | `.env.local`과 동일한 값(공개 가능) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ 필수 | `.env.local`과 동일한 값(공개 가능, RLS로 보호됨) |
| `GEMINI_API_KEY` | ✅ 필수(RAG 비서 동작에 필요) | 비우면 결정론적 fallback 답변만 동작(코드 자체는 안전하게 동작) |
| `GEMINI_LLM_MODEL` / `GEMINI_EMBEDDING_MODEL` | 선택 | 비우면 코드 기본값(`gemini-2.5-flash` / `gemini-embedding-001`) 사용 |
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ 등록하지 않음 | 앱 코드 어디에서도 사용하지 않음(RLS만으로 격리) |
| `MAKE_WEBHOOK_URL` | ❌ 등록하지 않음 | 레거시 경로, 기본 꺼짐(`LEGACY_MAKE_SYNC_ENABLED=false`)이라 운영에서 불필요 |
| `SILVERLINK_DRY_RUN` | 선택(기본값 `true` 권장) | 레거시 Make 경로용 안전 스위치 — 운영에서도 `true` 유지 |
| `LEGACY_MAKE_SYNC_ENABLED` | 선택(기본값 `false` 권장) | 켜지 않음 — Day6+7부터 Supabase가 메인 저장 경로 |

값을 바꿔야 할 때: Vercel Project Settings → Environment Variables에서 수정 → 기존 배포에는 자동 반영되지 않으므로 "Redeploy"를 한 번 눌러줘야 합니다(또는 다음 `git push`를 기다림).

## 4. OAuth/Auth 리다이렉트 URL 갱신 (배포된 주소가 정해진 뒤 1회)

배포 주소(`https://silverlink-ai.vercel.app` 등)가 확정되면, **로그인(이메일 확인 링크, Google 로그인)이 정상 동작하려면 아래 두 곳에 그 주소를 추가**해야 합니다 — 등록하지 않으면 로그인 후 `localhost`로 잘못 리다이렉트되거나 OAuth 콜백이 거부됩니다.

1. **Supabase Dashboard → Authentication → URL Configuration**
   - Site URL: 운영 주소로 변경(또는 추가) — 예: `https://silverlink-ai.vercel.app`
   - Redirect URLs: `https://silverlink-ai.vercel.app/auth/callback` 추가 (기존 `http://localhost:3000/auth/callback`은 로컬 개발용으로 그대로 둠)
2. **Google Cloud Console — 변경 불필요**: Google OAuth 클라이언트의 "승인된 리다이렉트 URI"는 Supabase 자체 콜백(`https://<project-ref>.supabase.co/auth/v1/callback`)으로 고정되어 있고, 우리 앱의 도메인과 무관합니다. 도메인이 바뀌어도 이 설정은 건드릴 필요 없음 — 1번(Supabase Redirect URLs)만 갱신하면 됩니다.

## 5. 배포 후 스모크 테스트 체크리스트

- [ ] `/login`, `/signup` 페이지 로드
- [ ] 이메일/비밀번호로 로그인
- [ ] Google 계정으로 로그인(리다이렉트가 운영 주소로 정상 복귀하는지)
- [ ] `/dashboard` 진입, 등록된 부모님/일정 정상 표시
- [ ] `/dashboard/assistant`에서 질문 1건 전송 — RAG 비서 답변 정상 수신(`GEMINI_API_KEY` 등록 확인 겸용)
- [ ] `/r/[token]`(실제 알림 큐에서 생성된 토큰)을 모바일에서 열어 응답 버튼 동작 확인

## 6. 롤백 방법

Vercel은 모든 배포본을 보관합니다. 문제가 생기면 Vercel 대시보드 → Deployments 탭에서 정상 동작했던 이전 배포를 찾아 "Promote to Production"(또는 "Redeploy")으로 즉시 되돌릴 수 있습니다 — `git revert` 없이도 가능한 가장 빠른 비상 대응입니다.

## 7. 다음에 연결되는 작업

- 지금 도메인(`*.vercel.app`)은 무료 서브도메인입니다. 실제 도메인을 사서 연결하게 되면 Vercel Project Settings → Domains에서 추가하고, 4장의 리다이렉트 URL을 새 도메인으로 다시 갱신해야 합니다.
- 이메일 발신 도메인 인증(Resend, 로드맵 다음 단계)은 이 Vercel 도메인과는 별개 트랙입니다 — Resend는 실제 보유 도메인의 DNS 레코드가 필요해서, `*.vercel.app` 서브도메인으로는 인증이 불가능합니다. 다음 단계 착수 시 이 문제를 먼저 짚고 갑니다.
