import type { SupabaseClient } from "@supabase/supabase-js";
import { executeActionIntent, type RagActionResult } from "./action-executor";
import type { CareTaskCandidate, RagActionIntent } from "./action-tools";
import { TASK_TYPE_LABELS } from "../care-tasks/task-type";
import type { RagAnswer } from "./types";

// 사용자가 채팅 UI에서 "확인" 버튼을 눌렀을 때 /api/rag/confirm-action이 호출한다. candidateTasks는
// 확인 시점에 다시 조회한 최신 목록 — 확인 전 그 사이에 일정이 완료/삭제됐을 수 있어 재검증한다
// (LLM이 고른 careTaskId를 그대로 신뢰하지 않는다, parseActionIntent와 같은 환각 방지 원칙).
// create_care_task는 candidateTasks 검증이 필요 없다(기존 일정을 고르는 게 아니라 새로 만드는 것이라,
// 소유권 검증은 executeActionIntent 내부 getParentProfileById가 RLS로 한다). 다른 두 타입은
// 실제 소유권 검증을 executeActionIntent 내부 getOwnCareTask가 RLS로 한 번 더 한다.
export async function confirmActionIntent(
  supabase: SupabaseClient,
  ownerUserId: string,
  intent: RagActionIntent,
  candidateTasks: CareTaskCandidate[],
  overrideMessageText?: string
): Promise<RagAnswer> {
  if (intent.type !== "create_care_task") {
    const stillValid = candidateTasks.some((task) => task.id === intent.careTaskId);
    if (!stillValid) {
      return {
        answerText: "이 일정은 더 이상 실행할 수 없어요(완료되었거나 변경됐을 수 있어요). 새로고침 후 다시 시도해 주세요.",
        evidence: [],
        nextSteps: [],
        hasSufficientEvidence: false,
      };
    }
  }

  const resolvedIntent =
    overrideMessageText && intent.type === "send_care_message"
      ? { ...intent, messageText: overrideMessageText }
      : intent;

  const result = await executeActionIntent(supabase, ownerUserId, resolvedIntent);
  return buildActionAnswer(result);
}

// 명령 실행 결과 안내는 LLM이 다시 쓰지 않고 고정 문장으로 만든다 — 무엇을 실제로 했는지에 대한
// 확인 메시지는 자연어로 윤색할 대상이 아니라 정확해야 하는 정보라서, 안전 관련 nextSteps와 같은
// 원칙(결정론적으로 정한다)을 따른다.
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
      nextSteps: [{ label: "안부전화 기록에서 응답 확인하기", href: "/dashboard/calls" }],
      hasSufficientEvidence: true,
    };
  }

  if (result.type === "create_care_task") {
    const taskTypeLabel = TASK_TYPE_LABELS[result.taskType];
    return {
      answerText: `새 일정을 등록했어요. (유형: ${taskTypeLabel}) 이제 이 일정으로 전화나 메시지를 요청할 수 있어요.`,
      evidence: [],
      nextSteps: [{ label: "등록한 일정 확인하기", href: "/dashboard/tasks" }],
      hasSufficientEvidence: true,
      createdCareTask: { careTaskId: result.careTaskId, originalRequest: result.originalRequest },
    };
  }

  return {
    answerText: "메시지를 보냈어요. 발송 결과는 발송 기록에서 확인할 수 있어요.",
    evidence: [],
    nextSteps: [{ label: "발송 기록에서 확인하기", href: "/dashboard/tasks" }],
    hasSufficientEvidence: true,
  };
}
