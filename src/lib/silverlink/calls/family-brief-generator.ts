import { getGeminiClient, getLlmModel } from "../rag/gemini-client";

export type FamilyBriefMindPoint = {
  text: string;
  emoji: string;
};

export type FamilyBriefConversationStarter = {
  suggestion: string;
  topic: string;
};

export type FamilyBriefResult = {
  mind_points: FamilyBriefMindPoint[];
  conversation_starters: FamilyBriefConversationStarter[];
  attention_item: string | null;
};

const SYSTEM_PROMPT = `당신은 SilverLink AI의 "가족 브리핑" 생성기입니다.
AI 안부전화 스크립트와 어르신 응답을 바탕으로, 자녀 보호자에게 보내는 짧은 브리핑을 생성합니다.

규칙:
- 의료 진단, 처방, 확정적 판단("괜찮습니다"/"위험합니다") 금지
- 임상·보고서 형식 금지 — 자녀가 편하게 읽을 수 있도록 평이한 한국어로 작성
- mind_points: 오늘 어르신의 상태·관심사를 나타내는 2~3개 포인트 (각 1문장, 스크립트 내용 기반)
- conversation_starters: 자녀가 이번 주 연락할 때 자연스럽게 쓸 수 있는 대화 시작 문구 2개
- attention_item: 긴급하지 않지만 가볍게 확인이 필요한 한 가지 사항 (없으면 null)

반드시 아래 JSON 형식으로만 출력:
{
  "mind_points": [{"text": "...", "emoji": "..."}],
  "conversation_starters": [{"suggestion": "...", "topic": "..."}],
  "attention_item": "..." 또는 null
}`;

// no_answer 상태는 어르신 응답이 없으므로 브리핑을 생성하지 않는다.
export async function generateFamilyBrief(
  callScript: string,
  parentResponse: string | null,
  status: string
): Promise<FamilyBriefResult | null> {
  if (status === "no_answer") return null;

  try {
    const userContent = `전화 스크립트:\n${callScript}\n\n어르신 응답: ${parentResponse ?? "없음"}\n통화 결과: ${status}`;

    const response = await getGeminiClient().models.generateContent({
      model: getLlmModel(),
      contents: userContent,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        thinkingConfig: { thinkingBudget: 0 },
        maxOutputTokens: 800,
        responseMimeType: "application/json",
      },
    });

    const text = response.text ?? "";
    const parsed = JSON.parse(text) as Partial<FamilyBriefResult>;

    return {
      mind_points: Array.isArray(parsed.mind_points) ? parsed.mind_points : [],
      conversation_starters: Array.isArray(parsed.conversation_starters) ? parsed.conversation_starters : [],
      attention_item: typeof parsed.attention_item === "string" && parsed.attention_item.length > 0
        ? parsed.attention_item
        : null,
    };
  } catch {
    return null;
  }
}
