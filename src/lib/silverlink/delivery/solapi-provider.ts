import { createHmac, randomBytes } from "crypto";
import type { DeliveryProvider, DeliveryRequest, DeliveryResult } from "./provider";

function makeAuthHeader(apiKey: string, apiSecret: string): string {
  const date = new Date().toISOString();
  const salt = randomBytes(16).toString("hex");
  const signature = createHmac("sha256", apiSecret).update(date + salt).digest("hex");
  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}

export class SolapiSmsProvider implements DeliveryProvider {
  readonly name = "solapi";

  async send(request: DeliveryRequest): Promise<DeliveryResult> {
    const apiKey = process.env.SOLAPI_API_KEY;
    const apiSecret = process.env.SOLAPI_API_SECRET;
    const from = process.env.SOLAPI_SENDER_NUMBER;

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

    const requestPayload = {
      message: {
        to: request.to_phone_number,
        from,
        text: request.message_text ?? "",
      },
    };

    let responsePayload: unknown;
    try {
      const res = await fetch("https://api.solapi.com/messages/v4/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: makeAuthHeader(apiKey, apiSecret),
        },
        body: JSON.stringify(requestPayload),
      });

      responsePayload = await res.json();

      if (!res.ok) {
        const err = responsePayload as Record<string, string>;
        return {
          provider: this.name,
          status: "failed",
          error_code: err.errorCode ?? String(res.status),
          error_message: err.errorMessage ?? "Solapi API 오류",
          request_payload: requestPayload,
          response_payload: responsePayload,
        };
      }
    } catch (e) {
      return {
        provider: this.name,
        status: "failed",
        error_code: "network_error",
        error_message: e instanceof Error ? e.message : "네트워크 오류",
        request_payload: requestPayload,
        response_payload: {},
      };
    }

    const res = responsePayload as Record<string, string>;
    return {
      provider: this.name,
      status: "sent",
      external_message_id: res.messageId ?? res.groupId,
      request_payload: requestPayload,
      response_payload: responsePayload,
    };
  }
}
