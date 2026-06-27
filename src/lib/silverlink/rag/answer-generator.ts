import type { RagAnswer, RagEvidence, RagNextStep, RagQueryCategory } from "./types";

const NO_EVIDENCE_TEXT = "관련 기록을 찾지 못했어요. 직접 확인해 보시는 걸 권장해요.";
const MAX_SUMMARY_ITEMS = 5;

// assistant-response.ts(텍스트 답변 생성)도 같은 라벨을 써야 해서 export한다.
export const CATEGORY_LABELS: Record<RagQueryCategory, string> = {
  summary: "최근 상태 요약",
  help: "도움 요청 확인",
  medication: "복약 관련",
  calls: "안부전화 결과",
  task_request: "새 일정 등록 요청",
  open: "자유 질문",
  action: "명령 실행",
  action_pending: "명령 확인 대기",
};

// 도움 요청/복약 같은 안전 관련 다음 행동은 LLM이 글을 쓰든 안 쓰든 항상 같은 결정론적 규칙으로
// 정해진다 — "이 상황엔 직접 연락을 권장해야 한다" 같은 판단을 LLM의 자연어 생성에 맡기지 않는다.
// assistant-response.ts도 LLM 텍스트 답변에 같은 nextSteps를 붙이기 위해 export한다.
// href는 그 항목을 유발한 근거의 parentId로 만든다 — 채팅 UI에서 바로 그 부모님 상세 화면으로
// 이동하는 버튼이 된다(Slice 12.0, "지금 확인할 일"을 텍스트가 아니라 실행 가능한 링크로 확장).
export function deriveNextSteps(category: RagQueryCategory, evidence: RagEvidence[]): RagNextStep[] {
  const nextSteps: RagNextStep[] = [];
  const helpItem = evidence.find((item) => item.safetyFlags.includes("help_requested"));
  if (helpItem) {
    nextSteps.push({ label: "도움 요청한 항목 직접 확인하기", href: `/dashboard/parents/${helpItem.parentId}` });
  }
  if (category === "medication") {
    const medicationItem = evidence.find((item) => item.safetyFlags.includes("medication_related"));
    if (medicationItem) {
      nextSteps.push({ label: "복약 메모를 다시 확인하기", href: `/dashboard/parents/${medicationItem.parentId}` });
    }
  }
  return nextSteps;
}

// 실제 LLM을 호출하지 않고, 모은 근거를 고정된 한국어 템플릿으로 정리한다(Day5/8/11과 같은
// code-first 원칙). GEMINI_API_KEY가 없을 때, 또는 assistant-response.ts의 호출이 실패했을 때의 안전한 경로다.
export function buildFallbackAnswer(category: RagQueryCategory, evidence: RagEvidence[]): RagAnswer {
  if (evidence.length === 0) {
    return { answerText: NO_EVIDENCE_TEXT, evidence: [], nextSteps: [], hasSufficientEvidence: false };
  }

  const topEvidence = evidence.slice(0, MAX_SUMMARY_ITEMS);
  const helpItems = evidence.filter((item) => item.safetyFlags.includes("help_requested"));

  const lines = [`최근 기록 ${evidence.length}건을 확인했어요.`, ...topEvidence.map((item) => `- ${item.title}: ${item.summary}`)];
  if (helpItems.length > 0) {
    lines.push(`이 중 도움 요청이 ${helpItems.length}건 있어요. 직접 연락해 확인해 보시는 걸 권장해요.`);
  }

  return { answerText: lines.join("\n"), evidence: topEvidence, nextSteps: deriveNextSteps(category, evidence), hasSufficientEvidence: true };
}

// LLM이 시스템 프롬프트를 무시하고 진단성 표현을 쓸 수 있어, 출력 후 한 번 더 거른다.
// 걸리면 호출한 쪽에서 buildFallbackAnswer로 대체한다.
const FORBIDDEN_PHRASES = ["치매입니다", "우울증입니다", "응급입니다", "병원에 안 가도 됩니다"];

export function containsForbiddenPhrase(text: string): boolean {
  return FORBIDDEN_PHRASES.some((phrase) => text.includes(phrase));
}
