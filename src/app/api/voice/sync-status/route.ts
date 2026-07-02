import { SolapiMessageService } from "solapi";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDeliveryAttemptById, updateDeliveryAttemptStatus } from "@/lib/supabase/delivery-attempts-repo";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

// 음성 TTS 발신 후 어르신의 키패드 응답 여부를 Solapi API 폴링으로 확인한다.
// 웹훅이 아니라 사용자 요청 시점에 Solapi getMessages()를 호출해 voiceReplied를 가져온다.
// RLS가 소유권을 보장하므로 인증된 사용자만 자신의 delivery_attempt를 조회·갱신할 수 있다.
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return jsonResponse({ ok: false, error: "unauthorized" }, 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "invalid_json" }, 400);
  }

  const deliveryAttemptId = typeof body === "object" && body !== null && "deliveryAttemptId" in body
    ? String((body as Record<string, unknown>).deliveryAttemptId)
    : null;

  if (!deliveryAttemptId) {
    return jsonResponse({ ok: false, error: "deliveryAttemptId_required" }, 400);
  }

  const attempt = await getDeliveryAttemptById(supabase, deliveryAttemptId);
  if (!attempt) {
    return jsonResponse({ ok: false, error: "not_found" }, 404);
  }
  if (attempt.channel !== "voice_call") {
    return jsonResponse({ ok: false, error: "not_voice_call" }, 400);
  }
  if (!attempt.external_message_id) {
    return jsonResponse({ ok: false, error: "no_external_id" }, 400);
  }

  const apiKey = process.env.SOLAPI_API_KEY;
  const apiSecret = process.env.SOLAPI_API_SECRET;
  if (!apiKey || !apiSecret) {
    return jsonResponse({ ok: false, error: "solapi_not_configured" }, 500);
  }

  try {
    const service = new SolapiMessageService(apiKey, apiSecret);
    const result = await service.getMessages({ groupId: attempt.external_message_id });

    // messageList는 Record<messageId, StoredMessage> 형태
    const messages = Object.values(result.messageList ?? {});
    if (messages.length === 0) {
      return jsonResponse({ ok: true, voiceReplied: false, status: attempt.status, synced: false });
    }

    const msg = messages[0];
    const voiceReplied = msg.voiceReplied ?? false;
    const duration = msg.voiceDuration ?? null;
    // voiceOptions는 Record<string, unknown>이라 실제 replyKey 필드명을 런타임에 추출한다
    const voiceOpts = msg.voiceOptions as Record<string, unknown> | null | undefined;
    const replyKey =
      voiceOpts?.replyKey ?? voiceOpts?.reply_key ?? voiceOpts?.pressedKey ?? null;

    const newStatus = voiceReplied ? "answered" : (msg.status ?? attempt.status);

    if (newStatus !== attempt.status || voiceReplied) {
      await updateDeliveryAttemptStatus(supabase, attempt.id, {
        status: newStatus,
        response_payload: { ...msg, synced_at: new Date().toISOString() },
      });
    }

    return jsonResponse({
      ok: true,
      voiceReplied,
      replyKey,
      duration,
      status: newStatus,
      synced: voiceReplied,
    });
  } catch (e) {
    return jsonResponse(
      { ok: false, error: "solapi_error", message: e instanceof Error ? e.message : "알 수 없는 오류" },
      500
    );
  }
}
