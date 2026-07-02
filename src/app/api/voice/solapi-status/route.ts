import { createSupabaseServerClient } from "@/lib/supabase/server";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

// Solapi 음성 발신 상태보고(콜백) 수신 엔드포인트.
// Solapi 콘솔(설정 → 상태보고 URL)에 다음 형식으로 등록한다:
//   https://<배포주소>/api/voice/solapi-status?secret=<SOLAPI_WEBHOOK_SECRET 값>
//
// 이 엔드포인트는 인증 세션 없이 Solapi 서버에서 직접 호출되므로,
// URL 파라미터 secret으로 요청 출처를 검증한다.
//
// DB 갱신은 SECURITY DEFINER RPC(handle_voice_callback)를 통해 anon 클라이언트로 처리한다.
// → 해당 함수를 Supabase 대시보드 SQL 편집기에서 먼저 실행해야 동작함
//   (docs/voice-webhook-setup.sql 참고)
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const incomingSecret = searchParams.get("secret") ?? "";
  const configuredSecret = process.env.SOLAPI_WEBHOOK_SECRET ?? "";

  if (!configuredSecret) {
    // 시크릿 미설정 시 운영 환경에서 웹훅을 아예 막는다
    return jsonResponse({ ok: false, error: "webhook_not_configured" }, 503);
  }
  if (incomingSecret !== configuredSecret) {
    return jsonResponse({ ok: false, error: "unauthorized" }, 401);
  }

  let payload: unknown;
  try {
    const text = await request.text();
    payload = JSON.parse(text);
  } catch {
    return jsonResponse({ ok: false, error: "invalid_json" }, 400);
  }

  const p = payload as Record<string, unknown>;

  // Solapi 상태보고 콜백 필드 추출
  const messageId = String(p.messageId ?? "");
  const groupId = String(p.groupId ?? "");
  const statusCode = String(p.statusCode ?? "");
  const statusMessage = String(p.statusMessage ?? "");
  const voiceReplied = Boolean(p.voiceReplied);
  const voiceDuration = typeof p.voiceDuration === "number" ? p.voiceDuration : null;
  const voiceOpts = p.voiceOptions as Record<string, unknown> | null | undefined;
  const replyKey =
    typeof (voiceOpts?.replyKey) === "number" ? (voiceOpts?.replyKey as number) :
    typeof (voiceOpts?.reply_key) === "number" ? (voiceOpts?.reply_key as number) : null;

  // external_message_id로 저장된 groupId로 delivery_attempt를 찾아 갱신
  // SECURITY DEFINER RPC가 anon 권한으로 내부에서 UPDATE를 수행한다
  const supabase = await createSupabaseServerClient();

  try {
    const { data, error } = await supabase.rpc("handle_voice_callback", {
      p_group_id: groupId,
      p_message_id: messageId,
      p_status_code: statusCode,
      p_status_message: statusMessage,
      p_voice_replied: voiceReplied,
      p_reply_key: replyKey,
      p_voice_duration: voiceDuration,
      p_raw_payload: payload,
    });

    if (error) {
      // RPC 함수가 아직 설정되지 않은 경우 — 202로 수신 확인만 하고 처리는 스킵
      console.error("[voice/solapi-status] RPC error:", error.message);
      return jsonResponse({ ok: false, error: "rpc_failed", detail: error.message }, 202);
    }

    return jsonResponse({ ok: true, result: data });
  } catch (e) {
    console.error("[voice/solapi-status] unexpected error:", e);
    return jsonResponse({ ok: false, error: "internal_error" }, 500);
  }
}
