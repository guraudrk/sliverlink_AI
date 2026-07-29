import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// 30명 어르신 이름
const ELDER_NAMES = [
  "김말순", "이복희", "박금순", "최순자", "정영자",
  "한경자", "윤순희", "강복자", "조말례", "신명자",
  "오점순", "서옥순", "권순금", "황말순", "임복순",
  "노경순", "하순남", "문옥자", "양말순", "고순희",
  "전복례", "차명순", "백순자", "손금희", "심복자",
  "안경자", "곽말순", "우순남", "민옥순", "구경자",
];

// 0-4: 즉시확인 (score ≤ 39 + 3회 연속 no_answer)
// 5-12: 추세악화 (score 43-52, 전주 60점대)
// 13-19: 정상 (score 70-90)
// 20-29: 보통 (score 56-69)
const SCORES_THIS  = [22,28,31,35,20, 43,47,52,49,44,51,46,50, 75,82,70,88,79,85,72, 62,58,65,67,59,63,68,61,56,66];
const SCORES_PREV  = [25,30,33,38,22, 62,67,71,68,63,70,65,69, 73,80,68,85,76,83,70, 60,55,62,64,57,61,65,59,54,63];

function weekStartISO(weeksAgo: number): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const daysFromMon = (kst.getUTCDay() + 6) % 7;
  kst.setUTCDate(kst.getUTCDate() - daysFromMon - weeksAgo * 7);
  kst.setUTCHours(0, 0, 0, 0);
  return kst.toISOString().slice(0, 10);
}

function daysAgoISO(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const uid = user.id;

  // ── 1. 기존 데모 org 확인 (이 유저가 admin인 것) ──────────────
  const { data: existing } = await supabase
    .from("org_members")
    .select("org_id, organizations!inner(is_demo)")
    .eq("user_id", uid)
    .eq("role", "admin")
    .eq("organizations.is_demo", true)
    .maybeSingle();

  let orgId: string;
  if (existing) {
    orgId = existing.org_id;
    // 기존 어르신 전체 삭제 → cascade로 calls / scores / alerts 모두 삭제
    const { error: delErr } = await supabase
      .from("parent_profiles")
      .delete()
      .eq("org_id", orgId);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });
  } else {
    // 새 데모 org 생성
    const slug = `demo-${uid.replace(/-/g, "").slice(0, 8)}`;
    const { data: newId, error: orgErr } = await supabase.rpc("create_org_with_admin", {
      p_name: "실버링크 데모 기관",
      p_slug: slug,
      p_admin_user_id: uid,
      p_is_demo: true,
    });
    if (orgErr) return NextResponse.json({ error: orgErr.message }, { status: 500 });
    orgId = newId as string;
  }

  // ── 2. 어르신 30명 생성 ────────────────────────────────────────
  const { data: elders, error: elderErr } = await supabase
    .from("parent_profiles")
    .insert(
      ELDER_NAMES.map((name) => ({
        display_name: name,
        owner_user_id: uid,
        org_id: orgId,
        assigned_user_id: uid,
      }))
    )
    .select("id");
  if (elderErr || !elders) return NextResponse.json({ error: elderErr?.message }, { status: 500 });

  // ── 3. social_scores — 4주치 ──────────────────────────────────
  const scoreRows = elders.flatMap((e, i) => [
    { parent_id: e.id, owner_user_id: uid, score: SCORES_THIS[i],                    week_start: weekStartISO(0) },
    { parent_id: e.id, owner_user_id: uid, score: SCORES_PREV[i],                    week_start: weekStartISO(1) },
    { parent_id: e.id, owner_user_id: uid, score: Math.max(SCORES_PREV[i] - 5,  20), week_start: weekStartISO(2) },
    { parent_id: e.id, owner_user_id: uid, score: Math.max(SCORES_PREV[i] - 10, 20), week_start: weekStartISO(3) },
  ]);
  const { error: scoreErr } = await supabase.from("social_scores").insert(scoreRows);
  if (scoreErr) return NextResponse.json({ error: scoreErr.message }, { status: 500 });

  // ── 4. care_call_attempts ─────────────────────────────────────
  // 즉시확인(0-4): 3회 연속 no_answer → ID가 필요해서 먼저 삽입
  const urgentRows = elders.slice(0, 5).flatMap((e) => [
    { parent_id: e.id, owner_user_id: uid, status: "no_answer", created_at: daysAgoISO(1) },
    { parent_id: e.id, owner_user_id: uid, status: "no_answer", created_at: daysAgoISO(2) },
    { parent_id: e.id, owner_user_id: uid, status: "no_answer", created_at: daysAgoISO(3) },
  ]);
  const { data: urgentCalls, error: ucErr } = await supabase
    .from("care_call_attempts")
    .insert(urgentRows)
    .select("id, parent_id, created_at");
  if (ucErr) return NextResponse.json({ error: ucErr.message }, { status: 500 });

  // 나머지(5-29): 패턴별 삽입
  const otherRows = elders.slice(5).flatMap((e, j) => {
    const i = j + 5;
    if (i < 13) { // 추세악화
      return [
        { parent_id: e.id, owner_user_id: uid, status: "answered",  created_at: daysAgoISO(1) },
        { parent_id: e.id, owner_user_id: uid, status: "no_answer", created_at: daysAgoISO(4) },
        { parent_id: e.id, owner_user_id: uid, status: "answered",  created_at: daysAgoISO(8) },
      ];
    } else if (i < 20) { // 정상
      return [
        { parent_id: e.id, owner_user_id: uid, status: "answered", created_at: daysAgoISO(1) },
        { parent_id: e.id, owner_user_id: uid, status: "answered", created_at: daysAgoISO(5) },
        { parent_id: e.id, owner_user_id: uid, status: "answered", created_at: daysAgoISO(9) },
      ];
    } else { // 보통
      return [
        { parent_id: e.id, owner_user_id: uid, status: "answered",  created_at: daysAgoISO(2) },
        { parent_id: e.id, owner_user_id: uid, status: "no_answer", created_at: daysAgoISO(10) },
      ];
    }
  });
  const { error: ocErr } = await supabase.from("care_call_attempts").insert(otherRows);
  if (ocErr) return NextResponse.json({ error: ocErr.message }, { status: 500 });

  // ── 5. safety_alerts — 즉시확인 3명 ─────────────────────────
  const ALERT_DATA = [
    { type: "fall",    severity: "critical", excerpt: "어제 넘어질 뻔했어요, 무릎이 많이 아프네요" },
    { type: "crisis",  severity: "critical", excerpt: "요즘 너무 힘들어요, 아무 의욕이 없어요" },
    { type: "medical", severity: "high",     excerpt: "가슴이 답답하고 숨이 조금 차는 것 같아요" },
  ] as const;

  const alertRows = elders.slice(0, 3).map((e, i) => {
    // 각 어르신의 daysAgo(1) 통화 → 첫 번째 urgent call
    const call = urgentCalls?.find(
      (c) => c.parent_id === e.id && c.created_at === daysAgoISO(1)
    ) ?? urgentCalls?.find((c) => c.parent_id === e.id);
    return {
      elder_id: e.id,
      owner_user_id: uid,
      call_id: call!.id,
      alert_type: ALERT_DATA[i].type,
      severity: ALERT_DATA[i].severity,
      trigger_excerpt: ALERT_DATA[i].excerpt,
    };
  });
  const { error: alertErr } = await supabase.from("safety_alerts").insert(alertRows);
  if (alertErr) return NextResponse.json({ error: alertErr.message }, { status: 500 });

  return NextResponse.json({ orgId, elderCount: 30 });
}
