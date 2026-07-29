# V2 진행 상황
최종 갱신: 2026-07-29
현재 위치: Day 35 / S4 대기
다음 작업: 담당자 필터 (social_worker/admin 전용)
🛑 대기 중인 승인: 없음

## 슬라이스 체크리스트

### Day 34 — F1 기관 테넌시
- [x] Day34 S1 영향도 조사
- [x] Day34 S2 마이그레이션 계획 🛑 (승인됨 2026-07-29)
- [x] Day34 S1 영향도 조사 ✅
- [x] Day34 S2 마이그레이션 계획 ✅ (승인됨 2026-07-29)
- [x] Day34 S3 마이그레이션 적용 ✅ (2026-07-29)
- [x] Day34 S4 RLS 정책 재작성 ✅ (migration에 포함)
- [x] Day34 S5 서버 코드 org 스코프 반영 ✅ (RLS가 DB 레이어에서 처리, 앱 코드 변경 불필요)
- [x] Day34 S6 멤버 초대 플로우 ✅ (create_org_with_admin 함수로 처리)
- [x] Day34 S7 회귀 테스트 + RLS 침투 테스트 ✅ (PT-0~3 전부 통과 2026-07-29)

### Day 35 — F2 기관 통합 대시보드
- [x] Day35 S0 디자인 락 ✅ (docs/design-system.md 생성 2026-07-29)
- [x] Day35 S1 listElderSummaries 기관 스코프 확장 ✅ (2026-07-29)
- [x] Day35 S2 KPI 헤더 ✅ (2026-07-29)
- [x] Day35 S3 위험도 정렬 + 플래그 사유 노출 ✅ (2026-07-29)
- [ ] Day35 S4 담당자 필터
- [ ] Day35 S5 성능 최적화 (60명 2초 이내)
- [ ] Day35 S6 디자인 검수 🛑

### Day 36 — F6 영업 데모 모드
- [ ] Day36 S1 organizations.is_demo + 실데이터 격리
- [ ] Day36 S2 POST /api/demo/seed-org
- [ ] Day36 S3 데모 계정 로그인 경로
- [ ] Day36 S4 3분 시연 리허설
- [ ] Day36 S5 완료 보고 🛑

### Day 37 — F3 AI 배치 리포트
- [ ] Day37 S1 reports 테이블
- [ ] Day37 S2 POST /api/reports/batch
- [ ] Day37 S3 리포트 프롬프트
- [ ] Day37 S4 데이터 부족 환각 금지 + 2단계 검증
- [ ] Day37 S5 개별 실패 재시도
- [ ] Day37 S6 성능 최적화 (60명 5분 이내)

### Day 38 — F5 붙여넣기 포맷
- [ ] Day38 S1 paste_text 생성 로직
- [ ] Day38 S2 템플릿 DB화
- [ ] Day38 S3 [기록 복사] 버튼
- [ ] Day38 S4 CSV 일괄 다운로드
- [ ] Day38 S5 데모 시연 + 최종 검수 🛑

### Day 39 — F4 자동 발송
- [ ] Day39 S1 report_schedules 테이블
- [ ] Day39 S2 POST /api/cron/weekly-reports
- [ ] Day39 S3 이메일 발송 수단 선택 + 구현
- [ ] Day39 S4 발송 이력 조회
- [ ] Day39 S5 실패 재시도 + 관리자 알림

### Day 40 — F7 개인정보
- [ ] Day40 S1 미팅 결과 수령 대기 🛑
- [ ] Day40 S2 녹음 원본 파기 정책
- [ ] Day40 S3 어르신 동의 획득 절차
- [ ] Day40 S4 접근 로그
- [ ] Day40 S5 데이터 삭제 요청 기능
- [ ] Day40 S6 docs/privacy-for-orgs.md

## 미팅 대기 항목
(오너의 기관 미팅 결과가 필요한 항목을 여기에 적는다)

- Day37: 리포트 주기 — 주 1회 / 격주 / 월 1회 중 무엇을 원하는가
- Day39: 수신 채널 — 이메일로 충분한가, 카카오 알림톡이 필요한가
- Day38: 붙여넣기 템플릿 — 기관마다 요구 형식이 얼마나 다른가
- Day40: 녹음 보관 — 기관이 보관을 원하는가, 파기를 원하는가

## 결정 기록
(승인·변경된 결정을 날짜와 함께 남긴다)

- 2026-07-29: V2-slices.md·V2-progress.md 생성, PRD §6·CLAUDE.md 문구 수정 완료. Day34 S1 시작.
- 2026-07-29: Day34 S1 완료 (영향도 조사: 테이블 14개·파일 36개). S2 v3 최종 승인. migration-v2-org-tenancy.sql 생성.
- 2026-07-29: Day34 S3~S7 완료. 마이그레이션 DB 적용 성공. 침투 테스트 PT-0~3 전부 통과. Day34 전 슬라이스 완료.
