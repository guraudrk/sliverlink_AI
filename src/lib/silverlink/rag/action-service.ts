import type { RagActionResult } from "./action-executor";
import type { RagAnswer } from "./types";

// 명령 실행 결과 안내는 LLM이 다시 쓰지 않고 고정 문장으로 만든다 — 무엇을 실제로 했는지에 대한
// 확인 메시지는 자연어로 윤색할 대상이 아니라 정확해야 하는 정보라서, 안전 관련 nextSteps와 같은
// 원칙(결정론적으로 정한다)을 따른다. assistant-response.ts가 Function Calling으로 행동 의도를
// 받으면 executeActionIntent로 실행한 뒤 이 함수로 확인 문구를 만든다.
export function buildActionAnswer(result: RagActionResult): RagAnswer {
  if (!result.ok) {
    const reason =
      result.error === "care_task_not_found"
        ? "해당 일정을 찾을 수 없어요."
        : result.error === "parent_not_found"
          ? "부모님 정보를 찾을 수 없어요."
          : "처리 중 문제가 생겼어요.";
    return { answerText: `${reason} 잠시 후 다시 시도해 주세요.`, evidence: [], nextSteps: [], hasSufficientEvidence: false };
  }

  if (result.type === "request_care_call") {
    return {
      answerText: "안부전화를 걸었어요. 어르신 응답은 안부전화 기록에서 확인할 수 있어요.",
      evidence: [],
      nextSteps: ["안부전화 기록에서 응답 확인하기"],
      hasSufficientEvidence: true,
    };
  }

  return {
    answerText: "메시지를 보냈어요. 발송 결과는 발송 기록에서 확인할 수 있어요.",
    evidence: [],
    nextSteps: [],
    hasSufficientEvidence: true,
  };
}
