import type { FunctionCall, FunctionDeclaration } from "@google/genai";
import { DELIVERY_CHANNEL_OPTIONS } from "../delivery/schema";

export const REQUEST_CARE_CALL_TOOL = "request_care_call";
export const SEND_CARE_MESSAGE_TOOL = "send_care_message";

export type DeliveryChannel = (typeof DELIVERY_CHANNEL_OPTIONS)[number];

export type RagActionIntent =
  | { type: "request_care_call"; careTaskId: string }
  | { type: "send_care_message"; careTaskId: string; channel: DeliveryChannel; messageText: string };

// 명령 실행 후보가 될 수 있는 일정 — 전체 RagEvidence가 아니라 이 좁은 형태만 LLM에게 보여준다
// (care_task_id를 정확히 골라야 하는 작업에 필요 없는 정보까지 줄 필요가 없다).
export type CareTaskCandidate = {
  id: string;
  originalRequest: string | null;
  status: string;
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
];

// FunctionCall.args는 SDK 타입상 unknown에 가까워서, 우리가 정의한 두 도구 중 하나로 정확히 매핑되는지 +
// care_task_id가 실제 후보 목록에 있는지(LLM의 환각 방지)를 검증하는 순수 함수로 분리했다.
// 네트워크 호출이 없어 단위 테스트로 직접 검증할 수 있다.
export function parseActionIntent(functionCall: FunctionCall | undefined, candidateTaskIds: string[]): RagActionIntent | null {
  if (!functionCall?.name) return null;

  const args = functionCall.args ?? {};
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
