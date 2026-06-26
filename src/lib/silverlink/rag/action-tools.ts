import type { FunctionCall, FunctionDeclaration } from "@google/genai";
import { DELIVERY_CHANNEL_OPTIONS } from "../delivery/schema";
import { TASK_TYPE_LABELS, TASK_TYPE_OPTIONS, classifyTaskType, type TaskType } from "../care-tasks/task-type";

export const REQUEST_CARE_CALL_TOOL = "request_care_call";
export const SEND_CARE_MESSAGE_TOOL = "send_care_message";
export const CREATE_CARE_TASK_TOOL = "create_care_task";

export type DeliveryChannel = (typeof DELIVERY_CHANNEL_OPTIONS)[number];

export type RagActionIntent =
  | { type: "request_care_call"; careTaskId: string }
  | { type: "send_care_message"; careTaskId: string; channel: DeliveryChannel; messageText: string }
  | { type: "create_care_task"; parentId: string; senderName: string; originalRequest: string; taskType?: TaskType };

// 명령 실행 후보가 될 수 있는 일정 — 전체 RagEvidence가 아니라 이 좁은 형태만 LLM에게 보여준다
// (care_task_id를 정확히 골라야 하는 작업에 필요 없는 정보까지 줄 필요가 없다).
export type CareTaskCandidate = {
  id: string;
  originalRequest: string | null;
  status: string;
};

// create_care_task의 parent_id 후보 — listParentProfiles(parent-profiles-repo.ts) 결과에서
// id/표시 이름만 추려 LLM에게 보여준다(care_context 등 민감한 내용까지 줄 필요는 없다).
export type ParentProfileCandidate = {
  id: string;
  displayName: string;
};

// listCareTasks(care-tasks-repo.ts) 결과에서 명령 실행 후보만 골라내는 순수 함수.
// 완료된 일정은 "전화 걸어줘" 같은 명령의 대상이 될 일이 없어 제외하고, parentId가 있으면 그 부모님
// 일정만 본다(전체 부모님 모드일 때도 너무 많은 후보를 LLM에 주지 않도록 limit으로 자른다).
export function selectActionCandidates(
  tasks: { id: string; parent_id: string; original_request: string | null; status: string }[],
  parentId?: string,
  limit = 15
): CareTaskCandidate[] {
  return tasks
    .filter((task) => task.status !== "completed")
    .filter((task) => !parentId || task.parent_id === parentId)
    .slice(0, limit)
    .map((task) => ({ id: task.id, originalRequest: task.original_request, status: task.status }));
}

// listParentProfiles(parent-profiles-repo.ts) 결과에서 create_care_task 후보만 골라내는 순수 함수.
// parentId가 선택돼 있으면(특정 부모님 모드) 그 한 명만 후보로 줘서 "누구인지" 되물을 필요가 없게 하고,
// 선택돼 있지 않으면(전체 부모님 모드) 전체 후보를 줘서 LLM이 필요하면 되묻게 한다.
export function selectParentCandidates(
  profiles: { id: string; display_name: string }[],
  parentId?: string
): ParentProfileCandidate[] {
  return profiles
    .filter((profile) => !parentId || profile.id === parentId)
    .map((profile) => ({ id: profile.id, displayName: profile.display_name }));
}

// "전화 걸어줘"/"메시지 보내줘" 명령을 실제 내부 API(POST /api/care-calls/preview, POST /api/delivery/preview)와
// 매핑하는 도구 선언. 기존 라우트의 안전장치(소유권 검증, MockDeliveryProvider)를 그대로 재사용하므로
// 여기서는 "어떤 일정에 대해 어떤 도구를 부를지"만 결정한다 — 실제 실행은 Slice 9에서 연결한다.
// assistant-response.ts가 답변 생성과 같은 호출에 이 도구들을 함께 등록한다(질문/명령 판단용 호출을
// 따로 두지 않는다 — 별도 호출이면 Gemini 호출 수가 질문마다 2배가 돼 무료 한도에 더 쉽게 걸린다).
export const ACTION_TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: REQUEST_CARE_CALL_TOOL,
    description:
      '특정 일정에 대해 어르신께 안부전화를 건다(Mock 전화, 실제 통신사 발신 없음). 자녀가 "전화 걸어줘", "전화해서 확인해줘"처럼 명확하게 전화를 요청했을 때만 호출한다.',
    parametersJsonSchema: {
      type: "object",
      properties: {
        care_task_id: {
          type: "string",
          description: "안부전화를 걸 대상 일정의 id. 반드시 아래 제공된 일정 목록에 있는 id 중 하나여야 한다.",
        },
      },
      required: ["care_task_id"],
    },
  },
  {
    name: SEND_CARE_MESSAGE_TOOL,
    description:
      '특정 일정과 관련해 어르신께 메시지를 보낸다(Mock 발송, 실제 외부 전송 없음). 자녀가 "메시지 보내줘", "문자 보내줘"처럼 명확하게 메시지 발송을 요청했을 때만 호출한다.',
    parametersJsonSchema: {
      type: "object",
      properties: {
        care_task_id: {
          type: "string",
          description: "메시지를 보낼 대상 일정의 id. 반드시 아래 제공된 일정 목록에 있는 id 중 하나여야 한다.",
        },
        channel: {
          type: "string",
          enum: [...DELIVERY_CHANNEL_OPTIONS],
          description: "발송 채널. 특별한 언급이 없으면 sms를 쓴다.",
        },
        message_text: {
          type: "string",
          description: "보낼 메시지 내용. 자녀의 요청을 바탕으로 어르신께 보낼 자연스러운 안부 문장을 작성한다.",
        },
      },
      required: ["care_task_id", "channel", "message_text"],
    },
  },
  {
    name: CREATE_CARE_TASK_TOOL,
    description:
      "기존 일정 목록에 맞는 게 없을 때, 새로운 돌봄 요청(일정)을 등록한다. sender_name/parent_id/original_request " +
      '세 가지가 모두 명확할 때만 호출한다. 요청 내용이 한두 단어로 모호하면(예: "전화하고 싶어", "확인해줘") 절대 ' +
      "호출하지 말고, 무엇을 확인/요청하고 싶은지 구체적으로 되물어라. parent_id가 명확하지 않으면(후보가 여러 명인데 " +
      "자녀가 누구인지 말하지 않음) 그것도 먼저 확인하라. task_type은 자녀가 직접 유형을 골랐을 때만 채우고, " +
      "자녀가 모르겠다고 하거나 자동 분류를 원하면 비워둔다(비워두면 요청 내용으로 자동 분류된다).",
    parametersJsonSchema: {
      type: "object",
      properties: {
        sender_name: {
          type: "string",
          description: "요청하는 자녀(보내는 분)의 이름. 자녀가 이미 밝혔을 때만 채운다 — 지어내지 않는다.",
        },
        parent_id: {
          type: "string",
          description: "새 일정을 등록할 부모님(받는 분)의 id. 반드시 아래 제공된 부모님 후보 목록에 있는 id 중 하나여야 한다.",
        },
        original_request: {
          type: "string",
          description:
            "구체적인 요청/확인 내용(전하실 말씀, 예: '오늘 점심 드셨는지 확인해 주세요'). 누가 무엇을 언제 하는지 " +
            "알 수 있는 완전한 문장이어야 한다 — 한두 단어짜리 모호한 표현은 쓰지 않는다.",
        },
        task_type: {
          type: "string",
          enum: [...TASK_TYPE_OPTIONS],
          description: "자녀가 직접 고른 일정 유형(복약/식사/수면/병원/운동/일반 안부 중 하나). 직접 고르지 않았으면 비워둔다.",
        },
      },
      required: ["sender_name", "parent_id", "original_request"],
    },
  },
];

const CHANNEL_CONFIRM_LABELS: Record<DeliveryChannel, string> = {
  link: "링크 응답",
  sms: "SMS",
  kakao_alimtalk: "카카오 알림톡",
  voice_call: "AI 안부전화",
  web_push: "웹 푸시",
};

// 명령을 실제로 실행하기 전 채팅 UI에 보여줄 확인 문구. 안전 관련 확인 메시지라 LLM이 다시 쓰지 않고
// buildActionAnswer/deriveNextSteps와 같은 원칙(결정론적으로 생성)을 따른다.
export function describeActionIntent(
  intent: RagActionIntent,
  candidateTasks: CareTaskCandidate[],
  parentCandidates: ParentProfileCandidate[] = []
): string {
  if (intent.type === "create_care_task") {
    const parent = parentCandidates.find((candidate) => candidate.id === intent.parentId);
    const parentLabel = parent?.displayName ?? "선택한 부모님";
    const taskTypeLabel = TASK_TYPE_LABELS[intent.taskType ?? classifyTaskType(intent.originalRequest)];
    return (
      `새 일정을 등록할까요?\n` +
      `보내는 분: ${intent.senderName}\n받는 분: ${parentLabel}\n전하실 말씀: ${intent.originalRequest}\n유형: ${taskTypeLabel}`
    );
  }

  const task = candidateTasks.find((candidate) => candidate.id === intent.careTaskId);
  const taskLabel = task?.originalRequest ?? "선택한 일정";

  if (intent.type === "request_care_call") {
    return `"${taskLabel}" 일정으로 안부전화를 걸까요?`;
  }

  return `"${taskLabel}" 일정으로 ${CHANNEL_CONFIRM_LABELS[intent.channel]} 메시지를 보낼까요?\n내용: ${intent.messageText}`;
}

// FunctionCall.args는 SDK 타입상 unknown에 가까워서, 우리가 정의한 세 도구 중 하나로 정확히 매핑되는지 +
// care_task_id/parent_id가 실제 후보 목록에 있는지(LLM의 환각 방지)를 검증하는 순수 함수로 분리했다.
// 네트워크 호출이 없어 단위 테스트로 직접 검증할 수 있다.
export function parseActionIntent(
  functionCall: FunctionCall | undefined,
  candidateTaskIds: string[],
  candidateParentIds: string[] = []
): RagActionIntent | null {
  if (!functionCall?.name) return null;

  const args = functionCall.args ?? {};

  if (functionCall.name === CREATE_CARE_TASK_TOOL) {
    const parentId = args.parent_id;
    const senderName = args.sender_name;
    const originalRequest = args.original_request;
    if (typeof parentId !== "string" || !candidateParentIds.includes(parentId)) return null;
    if (typeof senderName !== "string" || senderName.trim().length === 0) return null;
    if (typeof originalRequest !== "string" || originalRequest.trim().length === 0) return null;
    // task_type은 선택 항목 — 자녀가 직접 고르지 않았으면(또는 LLM이 유효하지 않은 값을 보내면)
    // 그냥 비워두고 실행 단계(classifyTaskType)에서 자동 분류하게 한다. 잘못된 값이라고 전체
    // 요청을 거부하지는 않는다(부가 정보일 뿐 안전 검증 대상이 아니므로).
    const rawTaskType = args.task_type;
    const taskType =
      typeof rawTaskType === "string" && (TASK_TYPE_OPTIONS as readonly string[]).includes(rawTaskType)
        ? (rawTaskType as TaskType)
        : undefined;
    return { type: "create_care_task", parentId, senderName, originalRequest, ...(taskType ? { taskType } : {}) };
  }

  const careTaskId = args.care_task_id;
  if (typeof careTaskId !== "string" || !candidateTaskIds.includes(careTaskId)) return null;

  if (functionCall.name === REQUEST_CARE_CALL_TOOL) {
    return { type: "request_care_call", careTaskId };
  }

  if (functionCall.name === SEND_CARE_MESSAGE_TOOL) {
    const messageText = args.message_text;
    if (typeof messageText !== "string" || messageText.trim().length === 0) return null;
    const channel = args.channel;
    const resolvedChannel: DeliveryChannel = (DELIVERY_CHANNEL_OPTIONS as readonly string[]).includes(channel as string)
      ? (channel as DeliveryChannel)
      : "sms";
    return { type: "send_care_message", careTaskId, channel: resolvedChannel, messageText };
  }

  return null;
}
