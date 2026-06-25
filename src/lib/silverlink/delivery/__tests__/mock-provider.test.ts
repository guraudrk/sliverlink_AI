import { describe, expect, it } from "vitest";
import { MockDeliveryProvider } from "../mock-provider";

describe("MockDeliveryProvider", () => {
  it("항상 status: sent와 provider: mock을 반환한다(실제 네트워크 호출 없음)", async () => {
    const provider = new MockDeliveryProvider();
    const result = await provider.send({ channel: "link", message_text: "테스트 메시지" });

    expect(result.provider).toBe("mock");
    expect(result.status).toBe("sent");
    expect(result.external_message_id).toMatch(/^mock-/);
  });

  it("request_payload에 입력값을 그대로 보관한다", async () => {
    const provider = new MockDeliveryProvider();
    const result = await provider.send({ channel: "voice_call", call_script: "안녕하세요" });

    expect(result.request_payload).toMatchObject({
      channel: "voice_call",
      call_script: "안녕하세요",
      message_text: null,
    });
  });
});
