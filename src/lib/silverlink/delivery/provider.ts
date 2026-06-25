export type DeliveryRequest = {
  channel: string;
  message_text?: string;
  call_script?: string;
};

export type DeliveryResult = {
  provider: string;
  status: "sent" | "failed";
  external_message_id?: string;
  error_code?: string;
  error_message?: string;
  request_payload: unknown;
  response_payload: unknown;
};

// 실제 twilio/kakao_partner/sms_provider/vapi/retell Provider(Day12+)가 이 인터페이스를 구현하게 될 것을
// 염두에 두고 만든 추상화. Day8에서는 MockDeliveryProvider만 존재한다.
export interface DeliveryProvider {
  readonly name: string;
  send(request: DeliveryRequest): Promise<DeliveryResult>;
}
