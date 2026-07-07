-- Day 23: 사회적 연결 점수 (social_scores)
-- Supabase SQL Editor에서 실행

create table if not exists social_scores (
  id              uuid        primary key default gen_random_uuid(),
  owner_user_id   uuid        not null references auth.users(id) on delete cascade,
  parent_id       uuid        not null references parent_profiles(id) on delete cascade,
  week_start      date        not null,  -- 해당 주 월요일 (ISO 기준)
  score           smallint    not null check (score >= 0 and score <= 100),
  call_count      smallint    not null default 0,
  answered_count  smallint    not null default 0,
  response_count  smallint    not null default 0,  -- 링크 응답 완료/도움요청 건수
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (owner_user_id, parent_id, week_start)
);

-- RLS 활성화
alter table social_scores enable row level security;

-- 본인 데이터만 조회/수정
create policy "owner can select social_scores"
  on social_scores for select
  using (owner_user_id = auth.uid());

create policy "owner can insert social_scores"
  on social_scores for insert
  with check (owner_user_id = auth.uid());

create policy "owner can update social_scores"
  on social_scores for update
  using (owner_user_id = auth.uid());

create policy "owner can delete social_scores"
  on social_scores for delete
  using (owner_user_id = auth.uid());

-- updated_at 자동 갱신 트리거 (이미 함수가 있으면 재사용)
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger social_scores_updated_at
  before update on social_scores
  for each row execute function update_updated_at_column();

-- 인덱스: 부모 + 주 순서 조회용
create index if not exists social_scores_parent_week_idx
  on social_scores (owner_user_id, parent_id, week_start desc);
