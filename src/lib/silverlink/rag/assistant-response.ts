import { ThinkingLevel } from "@google/genai";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getGeminiClient, getLlmModel } from "./gemini-client";
import { formatHistoryTranscript } from "./conversation-history";
import { ACTION_TOOL_DECLARATIONS, parseActionIntent, type CareTaskCandidate } from "./action-tools";
import { executeActionIntent } from "./action-executor";
import { buildActionAnswer } from "./action-service";
import { buildFallbackAnswer, containsForbiddenPhrase, deriveNextSteps, CATEGORY_LABELS } from "./answer-generator";
import type { RagAnswer, RagEvidence, RagQueryCategory } from "./types";
import type { ConversationMessage } from "./schema";

const MAX_SUMMARY_ITEMS = 5;

// 질문 답변(자연스러운 톤)과 명령 판단(Function Calling)을 같은 호출에 합쳤다 — 따로 호출하면
// 질문 하나마다 Gemini를 두 번 부르게 되어 무료 한도에 더 쉽게 걸리고, 1차 호출이 막히면 조용히
// buildFallbackAnswer로 떨어져 "답변이 매끄럽지 않다"는 결과로 이어졌다(직접 겪은 문제, work-log 참고).
const COMBINED_SYSTEM_PROMPT = `당신은 SilverLink AI의 "돌봄 기록 AI 비서"입니다. 자녀가 부모님에 대해 질문하거나, 전화/메시지 발송 같은 작업을 지시합니다.

명령 처리(도구 호출 여부 판단):
- "전화 걸어줘", "메시지 보내줘"처럼 명확한 명령일 때만 제공된 도구를 호출하세요.
- 어떤 일정에 대한 명령인지 명확하지 않으면(일정이 여러 개 비슷하게 들어맞거나 목록에 해당하는 게 없으면) 도구를 호출하지 말고 텍스트로 되물으세요.
- care_task_id는 반드시 제공된 일정 목록에 있는 값을 그대로 써야 합니다. 지어내지 마세요.

질문 답변(도구를 호출하지 않을 때, 텍스트로 답변):
- 당신은 의사, 응급요원, 변호사, 치료사가 아닙니다. 진단/처방이나 "괜찮습니다" 같은 확정적인 의학 판단을 내리지 마세요.
- 아래 제공된 근거 목록에 있는 내용만 바탕으로 답하세요. 근거에 없는 내용을 지어내지 마세요.
- 근거를 단순히 줄줄이 나열하지 말고, 날짜·시간·구체적인 상황을 살려서 자연스러운 구어체 문장으로, 빠짐없이 구체적으로 답하세요.
- 근거에 "도움 요청" 표시가 있으면 직접 연락을 권유하세요.
- 이전 대화가 있다면 그 흐름에 맞게 답하세요. 분량 제한보다 구체성이 우선입니다.`;

type TurnDecision =
  | { type: "action"; intent: import("./action-tools").RagActionIntent }
  | { type: "text"; text: string }
  | { type: "none" };

async function decideTurn(
  category: RagQueryCategory,
  evidence: RagEvidence[],
  candidateTasks: CareTaskCandidate[],
  query: string,
  history: ConversationMessage[] | undefined
): Promise<TurnDecision> {
  const evidenceText =
    evidence
      .slice(0, MAX_SUMMARY_ITEMS)
      .map(
        (item) =>
          `- [${item.sourceType}] ${item.title}: ${item.summary} (${item.createdAt}, 안전 표시: ${
            item.safetyFlags.join(", ") || "없음"
          })`
      )
      .join("\n") || "(관련 근거 없음)";

  const taskListText =
    candidateTasks.length > 0
      ? candidateTasks.map((task) => `- id=${task.id}, 내용: ${task.originalRequest ?? "(내용 없음)"}, 상태: ${task.status}`).join("\n")
      : "(현재 실행 가능한 일정 없음 — 명령을 내려도 도구를 호출하지 말고 그 사실을 안내하세요)";

  const transcript = formatHistoryTranscript(history);

  const baseConfig = {
    systemInstruction: COMBINED_SYSTEM_PROMPT,
    // 명령 disambiguation은 정확도가 속도보다 중요하고, 완전히 끄면(budget:0) 모호한 명령에서 함수
    // 호출 자체를 누락시키는 위험이 직접 검증됐다(work-log Day14 Slice 7 보강 2차 참고) — MINIMAL 유지.
    thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
    maxOutputTokens: 1200,
  };
  const config = candidateTasks.length > 0 ? { ...baseConfig, tools: [{ functionDeclarations: ACTION_TOOL_DECLARATIONS }] } : baseConfig;

  const response = await getGeminiClient().models.generateContent({
    model: getLlmModel(),
    contents: `${transcript}질문 분류: ${CATEGORY_LABELS[category]}\n\n근거 목록:\n${evidenceText}\n\n현재 미완료 일정 목록(명령 대상 후보):\n${taskListText}\n\n자녀의 메시지: ${query}`,
    config,
  });

  const functionCall = response.candidates?.[0]?.content?.parts?.find((part) => part.functionCall)?.functionCall;
  if (functionCall) {
    const intent = parseActionIntent(functionCall, candidateTasks.map((task) => task.id));
    if (intent) return { type: "action", intent };
  }

  if (response.text) return { type: "text", text: response.text };
  return { type: "none" };
}

// /api/rag/ask의 단일 진입점 — 질문 답변과 명령 실행을 한 번의 Gemini 호출로 같이 판단한다.
export async function generateAssistantAnswer(
  supabase: SupabaseClient,
  ownerUserId: string,
  category: RagQueryCategory,
  evidence: RagEvidence[],
  candidateTasks: CareTaskCandidate[],
  query: string,
  history: ConversationMessage[] | undefined
): Promise<{ category: RagQueryCategory; answer: RagAnswer }> {
  // 근거도 없고 실행할 수 있는 일정도 없으면 Gemini를 부를 이유가 없다 — 비용 없이 바로 안내한다.
  if (evidence.length === 0 && candidateTasks.length === 0) {
    return { category, answer: buildFallbackAnswer(category, evidence) };
  }

  try {
    const decision = await decideTurn(category, evidence, candidateTasks, query, history);

    if (decision.type === "action") {
      const result = await executeActionIntent(supabase, ownerUserId, decision.intent);
      return { category: "action", answer: buildActionAnswer(result) };
    }

    if (decision.type === "text" && !containsForbiddenPhrase(decision.text)) {
      return {
        category,
        answer: {
          answerText: decision.text,
          evidence: evidence.slice(0, MAX_SUMMARY_ITEMS),
          nextSteps: deriveNextSteps(category, evidence),
          hasSufficientEvidence: evidence.length > 0,
        },
      };
    }
  } catch {
    // Gemini 호출이 실패해도(네트워크/요금 한도 등) 답변 자체가 끊기지 않도록 fallback으로 내려간다.
  }

  return { category, answer: buildFallbackAnswer(category, evidence) };
}
