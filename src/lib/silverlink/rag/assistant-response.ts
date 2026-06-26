import { ApiError, type GenerateContentParameters, type GenerateContentResponse } from "@google/genai";
import { getGeminiClient, getLlmModel } from "./gemini-client";
import { formatHistoryTranscript } from "./conversation-history";
import {
  ACTION_TOOL_DECLARATIONS,
  describeActionIntent,
  parseActionIntent,
  type CareTaskCandidate,
  type ParentProfileCandidate,
  type RagActionIntent,
} from "./action-tools";
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

새 일정 등록(기존 일정 목록에 맞는 게 없을 때):
- 자녀가 새로운 용건을 말하면, "보내는 분"(sender_name), "받는 분"(parent_id, 후보가 여러 명일 때), "전하실 말씀"(original_request, 구체적인 내용) 이 세 가지가 모두 명확해지기 전에는 절대 create_care_task를 호출하지 마세요. "유형"(task_type)도 항상 같이 안내하고 물어보되, 자녀가 직접 고르지 않고 "자동 분류"를 원하면(또는 답을 안 하면) task_type 없이 호출해도 됩니다(비워두면 요청 내용으로 자동 분류됩니다) — 이 항목만은 답이 없어도 호출을 막지 않습니다.
- 보내는 분/받는 분/전하실 말씀 중 하나라도 빠졌거나 조금이라도 모호하면, 절대 추측하거나 지어내지 말고 아래 형식 그대로 4개 항목 전부를 번호 매겨 되물으세요(이미 명확히 알고 있는 항목은 다시 묻지 말고, 모르는 항목만 적으세요. 단, "4. 유형"은 처음 물을 때 항상 옵션 설명을 포함해서 적으세요):
  "새 일정을 등록하려면 아래 내용을 알려주세요.
  1. 보내는 분: (이름)
  2. 받는 분: (부모님 이름)
  3. 전하실 말씀: (구체적인 요청 내용)
  4. 유형: 복약 / 식사 / 수면·낮잠 / 병원 / 운동 / 일반 안부 중 하나를 골라주세요(모르면 '자동 분류'라고 답해도 됩니다)"
- 한두 단어짜리 모호한 요청("전화하고 싶어", "확인해줘")은 절대 그대로 등록하지 말고 위 형식으로 되물으세요.
- parent_id는 반드시 제공된 부모님 후보 목록에 있는 값을 그대로 써야 합니다. 지어내지 마세요.
- sender_name은 자녀가 직접 밝힌 이름만 채우세요. 지어내지 마세요.
- task_type은 자녀가 위 6개 중 하나를 직접 말했을 때만 그 값을 채우세요. "자동 분류"라고 답했거나 언급이 없으면 task_type 필드를 채우지 마세요.

질문 답변(도구를 호출하지 않을 때, 텍스트로 답변):
- 당신은 의사, 응급요원, 변호사, 치료사가 아닙니다. 진단/처방이나 "괜찮습니다" 같은 확정적인 의학 판단을 내리지 마세요.
- 아래 제공된 근거 목록에 있는 내용만 바탕으로 답하세요. 근거에 없는 내용을 지어내지 마세요.
- 절대 "- 제목: 내용" 같은 목록/불릿 형태로 답하지 마세요. 실제 사람이 옆에서 말로 설명해주듯, 자연스러운
  구어체 문장으로 풀어서 이야기하세요. 마치 친한 지인이 부모님 소식을 전화로 전해주는 것처럼요.
- 날짜·시간·구체적인 상황을 살려서, 빠짐없이 구체적으로 답하세요. 분량 제한보다 구체성이 우선입니다.
- 근거에 "도움 요청" 표시가 있으면 직접 연락을 권유하세요.
- 이전 대화가 있다면 그 흐름에 맞게 답하세요.`;

type TurnDecision = { type: "action"; intent: RagActionIntent } | { type: "text"; text: string } | { type: "none" };

// Gemini free tier는 수요가 몰리면 모델을 가리지 않고 503(UNAVAILABLE)이 가끔 난다(직접 호출로 확인) —
// SDK 자체는 이런 일시적 오류를 재시도해주지 않아서, 한 번이라도 걸리면 매번 결정론적 fallback 템플릿으로
// 떨어져 "답변이 단순 요약식이다"는 결과로 바로 이어졌다. 429/5xx 같은 일시적 오류에만 짧게 한 번 재시도한다
// (Google이 응답에 적어주는 49초 같은 retryDelay를 그대로 기다리면 챗봇이 못 쓸 정도로 느려진다 — 800ms만 기다린다).
const TRANSIENT_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// classifyQuery는 자녀의 "이번 질문" 한 문장만 보고 분류하기 때문에, 새 일정 등록 흐름의 후속
// 턴(예: 빠진 항목에 답하는 "1.이름 2.... 3.식사")처럼 명령 키워드가 전혀 없는 메시지는 task_request로
// 분류되지 않아 evidenceText가 그대로 답변에 붙어버린다(실제로 겪은 버그). 사용자 입력이 아니라
// "우리가 직접 작성한 되묻기 템플릿 문구"가 응답에 들어있는지를 검사하면, 자녀가 어떤 식으로 표현했든
// 상관없이 이 턴이 새 일정 등록 흐름인지 결정론적으로 판단할 수 있다.
export function looksLikeTaskCreationClarification(text: string): boolean {
  return text.includes("보내는 분") && text.includes("전하실 말씀");
}

async function generateContentWithRetry(params: GenerateContentParameters): Promise<GenerateContentResponse> {
  try {
    return await getGeminiClient().models.generateContent(params);
  } catch (error) {
    if (error instanceof ApiError && TRANSIENT_STATUS_CODES.has(error.status)) {
      await delay(800);
      return await getGeminiClient().models.generateContent(params);
    }
    throw error;
  }
}

function buildParentListText(parentCandidates: ParentProfileCandidate[], selectedParentId: string | undefined): string {
  if (selectedParentId) {
    const selected = parentCandidates.find((parent) => parent.id === selectedParentId);
    return selected
      ? `이미 선택된 부모님: ${selected.displayName} (id=${selected.id}) — 새 일정을 만들 때는 이 분으로 간주하고 따로 묻지 마세요.`
      : "(선택된 부모님 정보를 찾을 수 없음)";
  }

  if (parentCandidates.length === 0) {
    // 평가(evaluation-fixtures 점검) 중 발견: 이 문구가 무조건 "안내하세요"였을 때, 새 일정 등록과
    // 무관한 일반 질문(예: 복약 기록 정리)에도 모델이 이 안내를 그대로 끌어와 답하는 현상을 실제로
    // 확인했다 — 적용 범위를 "새 일정을 등록하려 할 때만"으로 명시해 일반 질문엔 영향을 안 주게 한다.
    return "(등록된 부모님 프로필이 없음 — 자녀가 새 일정을 등록하려고 할 때만 부모님 프로필을 먼저 등록해야 한다고 안내하세요. 그 외의 일반 질문에는 이 사실을 언급하지 마세요.)";
  }

  return `부모님 후보 목록(새 일정 등록 시 parent_id로 사용, 누구인지 명확하지 않으면 먼저 확인):\n${parentCandidates
    .map((parent) => `- id=${parent.id}, 이름: ${parent.displayName}`)
    .join("\n")}`;
}

async function decideTurn(
  category: RagQueryCategory,
  evidence: RagEvidence[],
  candidateTasks: CareTaskCandidate[],
  parentCandidates: ParentProfileCandidate[],
  selectedParentId: string | undefined,
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

  const parentListText = buildParentListText(parentCandidates, selectedParentId);
  const transcript = formatHistoryTranscript(history);

  const baseConfig = {
    systemInstruction: COMBINED_SYSTEM_PROMPT,
    // gemini-2.5-flash는 thinkingLevel을 지원하지 않고(400 INVALID_ARGUMENT, 직접 확인) thinkingBudget만
    // 받는다. budget:0(사고 비활성화)으로도 명확한 명령의 function calling과 모호한 명령의 되묻기가
    // 둘 다 정확히 동작함을 직접 호출로 검증했다 — 속도를 위해 0으로 둔다.
    thinkingConfig: { thinkingBudget: 0 },
    maxOutputTokens: 1200,
  };
  const hasAnyTool = candidateTasks.length > 0 || parentCandidates.length > 0;
  const config = hasAnyTool ? { ...baseConfig, tools: [{ functionDeclarations: ACTION_TOOL_DECLARATIONS }] } : baseConfig;

  const response = await generateContentWithRetry({
    model: getLlmModel(),
    contents: `${transcript}질문 분류: ${CATEGORY_LABELS[category]}\n\n근거 목록:\n${evidenceText}\n\n현재 미완료 일정 목록(명령 대상 후보):\n${taskListText}\n\n${parentListText}\n\n자녀의 메시지: ${query}`,
    config,
  });

  const functionCall = response.candidates?.[0]?.content?.parts?.find((part) => part.functionCall)?.functionCall;
  if (functionCall) {
    const intent = parseActionIntent(
      functionCall,
      candidateTasks.map((task) => task.id),
      parentCandidates.map((parent) => parent.id)
    );
    if (intent) return { type: "action", intent };
  }

  if (response.text) return { type: "text", text: response.text };
  return { type: "none" };
}

export type AssistantTurnResult = {
  category: RagQueryCategory;
  answer: RagAnswer;
  pendingAction?: RagActionIntent;
};

// /api/rag/ask의 단일 진입점 — 질문 답변과 명령 판단을 한 번의 Gemini 호출로 같이 한다. 명령은 여기서
// 곧바로 실행하지 않고 "실행 전 확인"(pendingAction)만 돌려준다 — 실제 실행은 사용자가 채팅 UI에서
// 확인 버튼을 눌렀을 때 /api/rag/confirm-action -> action-service.ts의 confirmActionIntent가 한다.
export async function generateAssistantAnswer(
  category: RagQueryCategory,
  evidence: RagEvidence[],
  candidateTasks: CareTaskCandidate[],
  parentCandidates: ParentProfileCandidate[],
  selectedParentId: string | undefined,
  query: string,
  history: ConversationMessage[] | undefined
): Promise<AssistantTurnResult> {
  // 근거도 없고 실행할 수 있는 일정도 없고 새 일정을 만들 부모님도 없으면 Gemini를 부를 이유가 없다.
  if (evidence.length === 0 && candidateTasks.length === 0 && parentCandidates.length === 0) {
    return { category, answer: buildFallbackAnswer(category, evidence) };
  }

  try {
    const decision = await decideTurn(category, evidence, candidateTasks, parentCandidates, selectedParentId, query, history);

    if (decision.type === "action") {
      const confirmText = describeActionIntent(decision.intent, candidateTasks, parentCandidates);
      return {
        category: "action_pending",
        answer: { answerText: confirmText, evidence: [], nextSteps: [], hasSufficientEvidence: true },
        pendingAction: decision.intent,
      };
    }

    if (decision.type === "text" && !containsForbiddenPhrase(decision.text)) {
      if (looksLikeTaskCreationClarification(decision.text)) {
        return {
          category: "task_request",
          answer: { answerText: decision.text, evidence: [], nextSteps: [], hasSufficientEvidence: false },
        };
      }
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

    if (decision.type === "text") {
      console.error("[assistant-response] 금지 표현 검출, fallback으로 대체:", decision.text);
    } else if (decision.type === "none") {
      console.error("[assistant-response] Gemini가 텍스트도 함수 호출도 반환하지 않음, fallback으로 대체");
    }
  } catch (error) {
    // Gemini 호출이 실패해도(네트워크/요금 한도 등) 답변 자체가 끊기지 않도록 fallback으로 내려가지만,
    // 원인을 알 수 없으면 똑같은 문제를 반복 진단해야 해서 서버 로그에는 남긴다.
    console.error("[assistant-response] Gemini 호출 실패, fallback으로 대체:", error);
  }

  return { category, answer: buildFallbackAnswer(category, evidence) };
}
