import { describe, expect, it } from "vitest";
import {
  describeActionIntent,
  parseActionIntent,
  selectActionCandidates,
  selectParentCandidates,
  CREATE_CARE_TASK_TOOL,
  REQUEST_CARE_CALL_TOOL,
  SEND_CARE_MESSAGE_TOOL,
} from "../action-tools";

const CANDIDATE_IDS = ["task-a", "task-b"];

describe("parseActionIntent", () => {
  it("functionCall이 없으면(질문이라 도구를 안 부른 경우) null을 반환한다", () => {
    expect(parseActionIntent(undefined, CANDIDATE_IDS)).toBeNull();
  });

  it("request_care_call을 RagActionIntent로 변환한다", () => {
    const result = parseActionIntent({ name: REQUEST_CARE_CALL_TOOL, args: { care_task_id: "task-a" } }, CANDIDATE_IDS);
    expect(result).toEqual({ type: "request_care_call", careTaskId: "task-a" });
  });

  it("send_care_message를 RagActionIntent로 변환하고, 채널이 없으면 sms로 기본값을 채운다", () => {
    const result = parseActionIntent(
      { name: SEND_CARE_MESSAGE_TOOL, args: { care_task_id: "task-b", message_text: "안부 전해요" } },
      CANDIDATE_IDS
    );
    expect(result).toEqual({ type: "send_care_message", careTaskId: "task-b", channel: "sms", messageText: "안부 전해요" });
  });

  it("send_care_message에 유효한 채널이 있으면 그대로 쓴다", () => {
    const result = parseActionIntent(
      { name: SEND_CARE_MESSAGE_TOOL, args: { care_task_id: "task-b", channel: "kakao_alimtalk", message_text: "안부 전해요" } },
      CANDIDATE_IDS
    );
    expect(result).toMatchObject({ channel: "kakao_alimtalk" });
  });

  it("care_task_id가 후보 목록에 없으면(LLM 환각) null을 반환한다", () => {
    const result = parseActionIntent({ name: REQUEST_CARE_CALL_TOOL, args: { care_task_id: "task-z" } }, CANDIDATE_IDS);
    expect(result).toBeNull();
  });

  it("care_task_id가 누락되면 null을 반환한다", () => {
    const result = parseActionIntent({ name: REQUEST_CARE_CALL_TOOL, args: {} }, CANDIDATE_IDS);
    expect(result).toBeNull();
  });

  it("send_care_message에 message_text가 비어 있으면 null을 반환한다", () => {
    const result = parseActionIntent(
      { name: SEND_CARE_MESSAGE_TOOL, args: { care_task_id: "task-a", message_text: "   " } },
      CANDIDATE_IDS
    );
    expect(result).toBeNull();
  });

  it("알 수 없는 도구 이름이면 null을 반환한다", () => {
    const result = parseActionIntent({ name: "unknown_tool", args: { care_task_id: "task-a" } }, CANDIDATE_IDS);
    expect(result).toBeNull();
  });

  const PARENT_IDS = ["parent-a", "parent-b"];

  it("create_care_task를 RagActionIntent로 변환한다", () => {
    const result = parseActionIntent(
      {
        name: CREATE_CARE_TASK_TOOL,
        args: { sender_name: "김철수", parent_id: "parent-a", original_request: "오늘 점심 드셨는지 확인" },
      },
      CANDIDATE_IDS,
      PARENT_IDS
    );
    expect(result).toEqual({
      type: "create_care_task",
      parentId: "parent-a",
      senderName: "김철수",
      originalRequest: "오늘 점심 드셨는지 확인",
    });
  });

  it("create_care_task의 parent_id가 후보 목록에 없으면(LLM 환각) null을 반환한다", () => {
    const result = parseActionIntent(
      { name: CREATE_CARE_TASK_TOOL, args: { sender_name: "김철수", parent_id: "parent-z", original_request: "확인해줘" } },
      CANDIDATE_IDS,
      PARENT_IDS
    );
    expect(result).toBeNull();
  });

  it("create_care_task의 original_request가 비어 있으면 null을 반환한다", () => {
    const result = parseActionIntent(
      { name: CREATE_CARE_TASK_TOOL, args: { sender_name: "김철수", parent_id: "parent-a", original_request: "   " } },
      CANDIDATE_IDS,
      PARENT_IDS
    );
    expect(result).toBeNull();
  });

  it("create_care_task의 sender_name이 비어 있으면 null을 반환한다", () => {
    const result = parseActionIntent(
      { name: CREATE_CARE_TASK_TOOL, args: { sender_name: "   ", parent_id: "parent-a", original_request: "확인해줘" } },
      CANDIDATE_IDS,
      PARENT_IDS
    );
    expect(result).toBeNull();
  });

  it("candidateParentIds를 안 주면(기본값 빈 배열) create_care_task는 항상 거부된다", () => {
    const result = parseActionIntent(
      { name: CREATE_CARE_TASK_TOOL, args: { sender_name: "김철수", parent_id: "parent-a", original_request: "확인해줘" } },
      CANDIDATE_IDS
    );
    expect(result).toBeNull();
  });

  it("create_care_task에 유효한 task_type이 있으면 그대로 포함한다", () => {
    const result = parseActionIntent(
      {
        name: CREATE_CARE_TASK_TOOL,
        args: { sender_name: "김철수", parent_id: "parent-a", original_request: "확인해줘", task_type: "meal" },
      },
      CANDIDATE_IDS,
      PARENT_IDS
    );
    expect(result).toMatchObject({ taskType: "meal" });
  });

  it("create_care_task에 유효하지 않은 task_type이 있으면 무시하고(전체 요청은 거부하지 않음) taskType 없이 반환한다", () => {
    const result = parseActionIntent(
      {
        name: CREATE_CARE_TASK_TOOL,
        args: { sender_name: "김철수", parent_id: "parent-a", original_request: "확인해줘", task_type: "없는유형" },
      },
      CANDIDATE_IDS,
      PARENT_IDS
    );
    expect(result).not.toBeNull();
    expect(result).not.toHaveProperty("taskType");
  });
});

function makeTask(overrides: Partial<{ id: string; parent_id: string; original_request: string | null; status: string }> = {}) {
  return { id: "task-a", parent_id: "p1", original_request: "복약 확인", status: "scheduled", ...overrides };
}

describe("selectActionCandidates", () => {
  it("완료된 일정은 후보에서 제외한다", () => {
    const tasks = [makeTask({ id: "t1", status: "completed" }), makeTask({ id: "t2", status: "scheduled" })];
    const result = selectActionCandidates(tasks);
    expect(result.map((t) => t.id)).toEqual(["t2"]);
  });

  it("parentId가 있으면 그 부모님의 일정만 남긴다", () => {
    const tasks = [makeTask({ id: "t1", parent_id: "p1" }), makeTask({ id: "t2", parent_id: "p2" })];
    const result = selectActionCandidates(tasks, "p1");
    expect(result.map((t) => t.id)).toEqual(["t1"]);
  });

  it("parentId가 없으면(전체 부모님) 모든 일정을 후보로 본다", () => {
    const tasks = [makeTask({ id: "t1", parent_id: "p1" }), makeTask({ id: "t2", parent_id: "p2" })];
    const result = selectActionCandidates(tasks);
    expect(result.map((t) => t.id)).toEqual(["t1", "t2"]);
  });

  it("limit을 넘으면 앞에서부터만 자른다", () => {
    const tasks = Array.from({ length: 5 }, (_, i) => makeTask({ id: `t${i}` }));
    const result = selectActionCandidates(tasks, undefined, 2);
    expect(result).toHaveLength(2);
  });
});

describe("selectParentCandidates", () => {
  const profiles = [
    { id: "p1", display_name: "어머니" },
    { id: "p2", display_name: "아버지" },
  ];

  it("parentId가 없으면(전체 부모님) 모든 프로필을 후보로 본다", () => {
    const result = selectParentCandidates(profiles);
    expect(result).toEqual([{ id: "p1", displayName: "어머니" }, { id: "p2", displayName: "아버지" }]);
  });

  it("parentId가 있으면 그 한 명만 후보로 남긴다", () => {
    const result = selectParentCandidates(profiles, "p2");
    expect(result).toEqual([{ id: "p2", displayName: "아버지" }]);
  });
});

describe("describeActionIntent", () => {
  const candidates = [{ id: "task-a", originalRequest: "낮잠 확인", status: "scheduled" }];

  it("request_care_call 확인 문구에 일정 내용을 포함한다", () => {
    const text = describeActionIntent({ type: "request_care_call", careTaskId: "task-a" }, candidates);
    expect(text).toContain("낮잠 확인");
    expect(text).toContain("안부전화");
  });

  it("send_care_message 확인 문구에 채널 라벨과 메시지 내용을 포함한다", () => {
    const text = describeActionIntent(
      { type: "send_care_message", careTaskId: "task-a", channel: "kakao_alimtalk", messageText: "안부 전해요" },
      candidates
    );
    expect(text).toContain("카카오 알림톡");
    expect(text).toContain("안부 전해요");
  });

  it("후보 목록에 없는 careTaskId면 \"선택한 일정\"으로 대체한다", () => {
    const text = describeActionIntent({ type: "request_care_call", careTaskId: "task-z" }, candidates);
    expect(text).toContain("선택한 일정");
  });

  it("create_care_task 확인 문구에 보내는 분/부모님 이름/요청 내용/유형을 포함한다", () => {
    const parentCandidates = [{ id: "p1", displayName: "어머니" }];
    const text = describeActionIntent(
      { type: "create_care_task", parentId: "p1", senderName: "김철수", originalRequest: "오늘 점심 드셨는지 확인" },
      [],
      parentCandidates
    );
    expect(text).toContain("김철수");
    expect(text).toContain("어머니");
    expect(text).toContain("오늘 점심 드셨는지 확인");
    expect(text).toContain("식사");
  });

  it("create_care_task에서 후보 목록에 없는 parentId면 \"선택한 부모님\"으로 대체한다", () => {
    const text = describeActionIntent(
      { type: "create_care_task", parentId: "p9", senderName: "김철수", originalRequest: "확인" },
      [],
      []
    );
    expect(text).toContain("선택한 부모님");
  });

  it("create_care_task에 taskType이 명시되면 자동 분류 대신 그 값을 그대로 표시한다", () => {
    const parentCandidates = [{ id: "p1", displayName: "어머니" }];
    const text = describeActionIntent(
      { type: "create_care_task", parentId: "p1", senderName: "김철수", originalRequest: "오늘 점심 드셨는지 확인", taskType: "hospital" },
      [],
      parentCandidates
    );
    expect(text).toContain("병원");
    expect(text).not.toContain("식사");
  });
});
