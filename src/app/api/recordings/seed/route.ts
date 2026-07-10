import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const SEED_RECORDINGS = [
  {
    duration_sec: 187,
    recorded_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30분 전
    status: "analyzed",
    transcript: `딸: 아버지, 오늘 어떠세요?
아버지: 응, 오늘은 좀 나아졌어. 어제 다리가 많이 아팠는데.
딸: 병원은 다녀오셨어요?
아버지: 아니, 그냥 쉬었어. 진통제 하나 먹었고.
딸: 오늘 밥은 드셨어요?
아버지: 응, 아침에 죽 먹었어. 점심은 배가 별로 없어서.
딸: 이웃 어르신들이랑 얘기도 좀 하시고요. 혼자만 계시면 안 돼요.
아버지: 응, 알겠어. 걱정하지 마.`,
    ai_summary: JSON.stringify({
      summary:
        "어르신이 어제 다리 통증을 겪었으나 오늘은 호전됨. 진통제를 복용하였고 아침 식사는 죽으로 드셨으나 점심은 거르심. 병원 방문은 하지 않은 상태.",
      signals: [
        { type: "physical", detected: true, note: "어제 다리 통증 언급, 오늘 호전 중" },
        { type: "emotional", detected: false, note: "" },
        { type: "cognitive", detected: false, note: "" },
        { type: "nutrition", detected: true, note: "점심 거름, 식욕 저하 언급" },
        { type: "medication", detected: true, note: "진통제 자가 복용, 병원 방문 미실시" },
        { type: "safety", detected: false, note: "" },
        { type: "social", detected: false, note: "" },
      ],
    }),
    risk_level: "low",
  },
  {
    duration_sec: 312,
    recorded_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), // 3시간 전
    status: "analyzed",
    transcript: `아들: 어머니, 저예요. 잘 지내셨어요?
어머니: 응, 잘 있었어. 근데 요즘 자꾸 혼자 있으니까 좀 외롭네.
아들: 그러시겠어요. 친구분들이랑 연락은 하시고 계세요?
어머니: 아니, 요즘 다들 바쁜지 연락이 없어. 텔레비전만 보고 있어.
아들: 밥은 잘 드세요?
어머니: 응, 밥은 잘 먹어. 어제 미역국 끓여 먹었어.
아들: 주무시는 건 어떠세요?
어머니: 밤에 좀 잠을 못 자. 새벽에 자꾸 깨.
아들: 다음 주에 제가 내려갈게요.
어머니: 그래, 기다릴게. 빨리 와.`,
    ai_summary: JSON.stringify({
      summary:
        "어머니께서 사회적 고립감과 외로움을 표현하심. 식사는 양호하나 수면의 질이 떨어져 새벽에 자주 깨신다고 하심. 정서적 지지와 방문이 필요한 상황.",
      signals: [
        { type: "physical", detected: false, note: "" },
        { type: "emotional", detected: true, note: "외로움, 고립감 직접 표현" },
        { type: "cognitive", detected: false, note: "" },
        { type: "nutrition", detected: false, note: "미역국 등 식사 양호" },
        { type: "medication", detected: false, note: "" },
        { type: "safety", detected: false, note: "" },
        { type: "social", detected: true, note: "친구 연락 없음, 외출 없이 TV만 시청" },
      ],
    }),
    risk_level: "medium",
  },
  {
    duration_sec: 95,
    recorded_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 어제
    status: "analyzed",
    transcript: `딸: 할머니, 저예요!
할머니: 오, 우리 손녀! 반갑다.
딸: 오늘 어떠세요? 건강하시죠?
할머니: 응, 오늘 날씨 좋아서 마당에 나가서 좀 걸었어.
딸: 와, 잘 하셨어요! 밥도 잘 드시고요?
할머니: 그럼, 오늘 점심 맛있게 먹었어. 옆집 할머니가 김치 줘서 같이 먹었어.
딸: 다음 주에 놀러 갈게요!
할머니: 오냐, 기다리고 있을게.`,
    ai_summary: JSON.stringify({
      summary:
        "전반적으로 건강 상태 양호. 날씨 좋은 날 마당 산책을 즐기셨고, 이웃과 음식을 나누는 등 사회적 교류가 활발함. 특이 이상 신호 없음.",
      signals: [
        { type: "physical", detected: false, note: "" },
        { type: "emotional", detected: false, note: "활기차고 긍정적인 대화" },
        { type: "cognitive", detected: false, note: "" },
        { type: "nutrition", detected: false, note: "점심 식사 양호" },
        { type: "medication", detected: false, note: "" },
        { type: "safety", detected: false, note: "마당 산책 무리 없음" },
        { type: "social", detected: false, note: "이웃과 교류 활발" },
      ],
    }),
    risk_level: "none",
  },
];

export async function POST() {
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  const { data: parents } = await supabase
    .from("parent_profiles")
    .select("id")
    .eq("owner_user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(3);

  if (!parents || parents.length === 0) {
    return NextResponse.json(
      { error: "먼저 어르신을 한 명 이상 등록해주세요." },
      { status: 400 }
    );
  }

  const rows = SEED_RECORDINGS.map((rec, i) => ({
    owner_user_id: user.id,
    parent_id: parents[i % parents.length].id,
    storage_path: null,
    ...rec,
  }));

  const { error } = await supabase.from("call_recordings").insert(rows);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, count: rows.length });
}
