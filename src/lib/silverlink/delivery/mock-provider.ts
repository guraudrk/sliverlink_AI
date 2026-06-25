import type { DeliveryProvider, DeliveryRequest, DeliveryResult } from "./provider";

// 실제 네트워크 호출을 절대 하지 않는다(fetch 등 외부 호출 import 없음) — Day8 범위에서 유일하게 쓰이는 Provider.
export class MockDeliveryProvider implements DeliveryProvider {
  readonly name = "mock";

  async send(request: DeliveryRequest): Promise<DeliveryResult> {
    const requestPayload = {
      channel: request.channel,
      message_text: request.message_text ?? null,
      call_script: request.call_script ?? null,
    };

    return {
      provider: this.name,
      status: "sent",
      external_message_id: `mock-${Date.now()}`,
      request_payload: requestPayload,
      response_payload: { mocked: true, receivedAt: new Date().toISOString() },
    };
  }
}
