import { describe, expect, it } from "vitest";
import { parseActionIntent, selectActionCandidates, REQUEST_CARE_CALL_TOOL, SEND_CARE_MESSAGE_TOOL } from "../action-tools";

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
