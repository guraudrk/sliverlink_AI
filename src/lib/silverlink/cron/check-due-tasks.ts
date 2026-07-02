import { createClient } from "@supabase/supabase-js";
import { MockDeliveryProvider } from "@/lib/silverlink/delivery/mock-provider";
import { SolapiSmsProvider } from "@/lib/silverlink/delivery/solapi-provider";
import { SolapiVoiceProvider } from "@/lib/silverlink/delivery/solapi-voice-provider";

// notification_queue에서 scheduled_for <= now() + status='prepared' 항목을 받아오는
// SECURITY DEFINER RPC의 반환 행 타입
type DueQueueItem = {
  id: string;
  care_task_id: string;
  channel: string;
  message_text: string | null;
  call_script: string | null;
  owner_user_id: string;
  parent_id: string;
  parent_phone: string | null;
};

const mockProvider = new MockDeliveryProvider();
const smsProvider = new SolapiSmsProvider();
const voiceProvider = new SolapiVoiceProvider();

export async function checkDueTasks(): Promise<{ processed: number; failed: number }> {
  // 크론은 사용자 세션이 없으므로 쿠키 없이 anon key로 직접 클라이언트 생성.
  // DB 접근은 SECURITY DEFINER RPC를 통해서만 하므로 RLS를 우회하되 서비스 롤 키는 쓰지 않는다.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // SECURITY DEFINER RPC: notification_queue + parent_profiles JOIN, RLS 우회
  // → docs/cron-setup.sql의 fetch_due_queue_for_cron() 함수가 먼저 등록돼 있어야 한다
  const { data, error: fetchError } = await supabase.rpc("fetch_due_queue_for_cron");

  if (fetchError) {
    console.error("[cron] fetch_due_queue_for_cron 오류:", fetchError.message);
    throw new Error(`fetch_due_queue_for_cron 실패: ${fetchError.message}`);
  }

  const items = (data ?? []) as DueQueueItem[];

  const enableRealSms = process.env.ENABLE_REAL_SMS === "true";
  const enableRealCalls = process.env.ENABLE_REAL_CALLS === "true";

  let processed = 0;
  let failed = 0;

  for (const item of items) {
    const provider =
      enableRealSms && item.channel === "sms" ? smsProvider :
      enableRealCalls && item.channel === "voice_call" ? voiceProvider :
      mockProvider;

    const result = await provider.send({
      channel: item.channel,
      message_text: item.message_text ?? undefined,
      call_script: item.call_script ?? undefined,
      to_phone_number: item.parent_phone ?? undefined,
    });

    // SECURITY DEFINER RPC: delivery_attempts INSERT + notification_queue UPDATE
    // → docs/cron-setup.sql의 record_cron_attempt() 함수가 먼저 등록돼 있어야 한다
    const { error: recordError } = await supabase.rpc("record_cron_attempt", {
      p_queue_id: item.id,
      p_owner_user_id: item.owner_user_id,
      p_parent_id: item.parent_id,
      p_provider: result.provider,
      p_channel: item.channel,
      p_status: result.status,
      p_external_message_id: result.external_message_id ?? null,
      p_error_code: result.error_code ?? null,
      p_error_message: result.error_message ?? null,
      p_request_payload: result.request_payload,
      p_response_payload: result.response_payload,
    });

    if (recordError) {
      console.error(`[cron] record_cron_attempt 오류 (queue ${item.id}):`, recordError.message);
      failed++;
    } else {
      console.log(`[cron] 처리 완료: channel=${item.channel}, status=${result.status}, queue=${item.id}`);
      processed++;
    }
  }

  return { processed, failed };
}
