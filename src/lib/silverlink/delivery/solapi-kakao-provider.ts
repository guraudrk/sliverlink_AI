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

export class SolapiKakaoProvider implements DeliveryProvider {
  readonly name = "solapi-kakao";

  async send(request: DeliveryRequest): Promise<DeliveryResult> {
    const apiKey = process.env.SOLAPI_API_KEY;
    const apiSecret = process.env.SOLAPI_API_SECRET;
    const from = process.env.SOLAPI_SENDER_NUMBER;
    const pfId = process.env.SOLAPI_KAKAO_PF_ID;
    const templateId = process.env.SOLAPI_KAKAO_TEMPLATE_ID;

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

    if (!pfId) {
      return {
        provider: this.name,
        status: "failed",
        error_code: "KAKAO_PF_ID_MISSING",
        error_message: "SOLAPI_KAKAO_PF_ID가 설정되지 않았습니다. 카카오 비즈니스 채널 승인 후 등록해 주세요.",
        request_payload: {},
        response_payload: {},
      };
    }

    if (!templateId) {
      return {
        provider: this.name,
        status: "failed",
        error_code: "KAKAO_TEMPLATE_ID_MISSING",
        error_message: "SOLAPI_KAKAO_TEMPLATE_ID가 설정되지 않았습니다. 카카오 알림톡 템플릿 심사 완료 후 등록해 주세요.",
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

    const messageText = request.message_text ?? "";
    const requestPayload = {
      type: "ATA" as const,
      to: request.to_phone_number,
      from,
      kakaoOptions: {
        pfId,
        templateId,
        variables: { "#{message}": messageText },
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
          error_message: firstFail?.statusMessage ?? "카카오 알림톡 발송 실패",
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
