import { CALL_GOAL_OPTIONS } from "@/lib/silverlink/delivery/schema";
import type { ParentProfile } from "@/lib/supabase/parent-profiles-repo";

type CallGoal = (typeof CALL_GOAL_OPTIONS)[number];

// CareTaskRow/CareTaskSummary 둘 다 만족하는 최소 형태 — 어느 쪽에서 호출해도 그대로 쓸 수 있게 한다.
type CareTaskLike = { original_request: string | null };

const MEDICATION_KEYWORDS = ["약", "복약", "혈압", "당뇨"];
const MEAL_KEYWORDS = ["식사", "밥", "끼니"];

// 실제 LLM을 호출하지 않는 키워드 기반 추론 — Day5의 code-first 원칙과 동일하게, 비용 없는
// 로컬 로직으로 먼저 전체 플로우를 검증한다.
export function inferCallGoal(text: string): CallGoal {
  if (MEDICATION_KEYWORDS.some((keyword) => text.includes(keyword))) return "medication_check";
  if (MEAL_KEYWORDS.some((keyword) => text.includes(keyword))) return "meal_check";
  return "wellbeing_check";
}

export type CallScript = {
  call_goal: CallGoal;
  opening: string;
  main_message: string;
  question: string;
};

export function buildCallScript(profile: ParentProfile, careTask: CareTaskLike): CallScript {
  const requestText = careTask.original_request ?? "";
  return {
    call_goal: inferCallGoal(requestText),
    opening: "안녕하세요, SilverLink AI 비서입니다.",
    main_message: `${profile.display_name}님, ${requestText}`,
    question: "이미 하셨으면 1번, 도움이 필요하면 2번을 눌러주세요. 응답이 없으시면 잠시 후 다시 연락드릴게요.",
  };
}

export function formatCallScriptText(script: CallScript): string {
  return `${script.opening} ${script.main_message} ${script.question}`;
}
