import { SolapiMessageService } from "solapi";
import type { DeliveryProvider, DeliveryRequest, DeliveryResult } from "./provider";

let cachedService: SolapiMessageService | null = null;

function getService(): SolapiMessageService {
  if (cachedService) return cachedService;
  const apiKey = process.env.SOLAPI_API_KEY ?? "";
  const apiSecret = process.env.SOLAPI_API_SECRET ?? "";
  cachedService = new SolapiMessageService(apiKey, apiSecret);
  return cachedService;
}

export class SolapiVoiceProvider implements DeliveryProvider {
  readonly name = "solapi-voice";

  async send(request: DeliveryRequest): Promise<DeliveryResult> {
    const from = process.env.SOLAPI_SENDER_NUMBER;
    const apiKey = process.env.SOLAPI_API_KEY;
    const apiSecret = process.env.SOLAPI_API_SECRET;

    if (!apiKey || !apiSecret || !from) {
      return {
        provider: this.name,
        status: "failed",
        error_code: "missing_env",
        error_message: "SOLAPI_API_KEY / SOLAPI_API_SECRET / SOLAPI_SENDER_NUMBER 환경변수가 없습니다",
        request_payload: {},
        response_payload: {},
      };
    }

    if (!request.to_phone_number) {
      return {
        provider: this.name,
        status: "failed",
        error_code: "missing_phone",
        error_message: "수신자 전화번호(parent_profiles.phone)가 등록되지 않았습니다",
        request_payload: {},
        response_payload: {},
      };
    }

    const ttsText = request.call_script ?? request.message_text ?? "";
    if (!ttsText) {
      return {
        provider: this.name,
        status: "failed",
        error_code: "missing_text",
        error_message: "음성으로 읽을 내용(call_script 또는 message_text)이 없습니다",
        request_payload: {},
        response_payload: {},
      };
    }

    const requestPayload = {
      type: "VOICE" as const,
      to: request.to_phone_number,
      from,
      text: ttsText,
      voiceOptions: {
        voiceType: "FEMALE" as const,
        // 1번: 완료, 2번: 도움 요청 — replyRange: 2는 1~2번 키패드 응답을 수집함
        replyRange: 2 as const,
      },
    };

    try {
      const service = getService();
      const result = await service.send(requestPayload);

      const groupId = result.groupInfo.groupId;
      const failedCount = result.failedMessageList?.length ?? 0;

      if (failedCount > 0) {
        const firstFail = result.failedMessageList[0];
        return {
          provider: this.name,
          status: "failed",
          error_code: String(firstFail?.statusCode ?? "unknown"),
          error_message: firstFail?.statusMessage ?? "음성 발신 실패",
          request_payload: requestPayload,
          response_payload: result,
        };
      }

      return {
        provider: this.name,
        status: "sent",
        external_message_id: groupId,
        request_payload: requestPayload,
        response_payload: result,
      };
    } catch (e) {
      return {
        provider: this.name,
        status: "failed",
        error_code: "sdk_error",
        error_message: e instanceof Error ? e.message : "Solapi SDK 오류",
        request_payload: requestPayload,
        response_payload: {},
      };
    }
  }
}
