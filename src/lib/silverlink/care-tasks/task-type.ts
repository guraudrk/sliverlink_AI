export const TASK_TYPE_OPTIONS = ["medication", "meal", "sleep", "hospital", "exercise", "general"] as const;
export type TaskType = (typeof TASK_TYPE_OPTIONS)[number];

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  medication: "복약",
  meal: "식사",
  sleep: "수면/낮잠",
  hospital: "병원",
  exercise: "운동",
  general: "일반 안부",
};

// 복약 키워드에 바른 "약"을 그대로 넣으면 "요약"의 일부로 오매칭됐던 적이 있어(Day12 evidence-builder
// 버그) 더 구체적인 형태만 쓴다. call-script-builder.ts의 inferCallGoal과 같은 code-first 원칙
// (LLM 호출 없는 키워드 매칭) — task_type은 관리용 분류 메타데이터일 뿐이라 단순 매칭으로 충분하다.
const MEDICATION_KEYWORDS = ["복약", "투약", "약 드", "약 먹", "혈압", "당뇨"];
const MEAL_KEYWORDS = ["식사", "밥", "끼니", "점심", "저녁", "아침"];
const SLEEP_KEYWORDS = ["낮잠", "수면", "잠을"];
const HOSPITAL_KEYWORDS = ["병원", "진료", "검진", "통원"];
const EXERCISE_KEYWORDS = ["운동", "산책"];

// 새 일정의 요청 내용(original_request)으로 관리용 유형을 분류한다 — "나중에 관리하기 편하도록"
// 일정을 종류별로 구분해두는 메타데이터일 뿐, 안전 판단에는 쓰이지 않는다.
export function classifyTaskType(text: string): TaskType {
  if (MEDICATION_KEYWORDS.some((keyword) => text.includes(keyword))) return "medication";
  if (MEAL_KEYWORDS.some((keyword) => text.includes(keyword))) return "meal";
  if (SLEEP_KEYWORDS.some((keyword) => text.includes(keyword))) return "sleep";
  if (HOSPITAL_KEYWORDS.some((keyword) => text.includes(keyword))) return "hospital";
  if (EXERCISE_KEYWORDS.some((keyword) => text.includes(keyword))) return "exercise";
  return "general";
}
