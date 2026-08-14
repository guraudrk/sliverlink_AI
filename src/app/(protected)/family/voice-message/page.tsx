"use client";

/**
 * B-6 자녀 목소리 메시지 녹음
 * - iPhone Safari 호환: audio/mp4 우선, WebM 폴백
 * - 최대 30초, Supabase Storage 직접 업로드
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { insertVoiceMessage, listVoiceMessages } from "@/lib/supabase/voice-messages-repo";
import type { VoiceMessage } from "@/lib/supabase/voice-messages-repo";

const MAX_SEC = 30;

type RecordState = "idle" | "recording" | "stopped" | "uploading" | "done" | "error";

function formatTime(sec: number) {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

// Safari는 audio/mp4, Chrome은 audio/webm;codecs=opus
function getSupportedMimeType(): string {
  const types = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg"];
  for (const t of types) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) return t;
  }
  return "audio/mp4";
}

export default function VoiceMessagePage() {
  const router = useRouter();
  const params = useSearchParams();
  const parentId = params.get("parentId");
  const parentName = params.get("name") ?? "어르신";

  const supabase = createSupabaseBrowserClient();

  const [state, setState] = useState<RecordState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const blobRef = useRef<Blob | null>(null);
  const mimeTypeRef = useRef<string>("audio/mp4");

  useEffect(() => {
    if (!parentId) return;
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      listVoiceMessages(supabase, parentId).then(setMessages).catch(() => {});
    });
  }, [parentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const startRecording = useCallback(async () => {
    setErrorMsg("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = getSupportedMimeType();
      mimeTypeRef.current = mimeType;

      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeTypeRef.current });
        blobRef.current = blob;
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setState("stopped");
      };

      recorder.start(100);
      mediaRecorderRef.current = recorder;
      setState("recording");
      setElapsed(0);

      timerRef.current = setInterval(() => {
        setElapsed((prev) => {
          if (prev + 1 >= MAX_SEC) {
            stopRecording();
            return MAX_SEC;
          }
          return prev + 1;
        });
      }, 1000);
    } catch {
      setErrorMsg("마이크 권한이 필요해요. 브라우저 설정에서 허용해 주세요.");
      setState("error");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stopRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  const upload = useCallback(async () => {
    if (!blobRef.current || !parentId) return;
    setState("uploading");

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("로그인이 필요해요");

      const ext = mimeTypeRef.current.includes("mp4") ? "mp4" : "webm";
      const storagePath = `${userData.user.id}/${parentId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("voice-messages")
        .upload(storagePath, blobRef.current, {
          contentType: mimeTypeRef.current,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      await insertVoiceMessage(
        supabase,
        userData.user.id,
        parentId,
        storagePath,
        elapsed,
        mimeTypeRef.current
      );

      setState("done");
      // 목록 갱신
      const updated = await listVoiceMessages(supabase, parentId);
      setMessages(updated);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "업로드 중 오류가 났어요.");
      setState("error");
    }
  }, [parentId, elapsed]); // eslint-disable-line react-hooks/exhaustive-deps

  const reset = useCallback(() => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    blobRef.current = null;
    setElapsed(0);
    setState("idle");
    setErrorMsg("");
  }, [audioUrl]);

  if (!parentId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F7FB] px-4">
        <div className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-[#E7EBF3]">
          <p className="text-[#475467]">어르신이 선택되지 않았어요. 대시보드로 돌아가 주세요.</p>
          <button
            onClick={() => router.push("/family")}
            className="mt-4 rounded-xl bg-[#2E5BFF] px-6 py-3 text-sm font-semibold text-white"
          >
            대시보드로 이동
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F7FB] px-4 py-8">
      <div className="mx-auto max-w-md">
        {/* 헤더 */}
        <button
          onClick={() => router.push("/family")}
          className="mb-6 flex items-center gap-1 text-sm font-medium text-[#2E5BFF]"
        >
          ← 돌아가기
        </button>

        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-[#E7EBF3]">
          <h1 className="text-xl font-bold text-[#101828]">
            {parentName}께 목소리 메시지
          </h1>
          <p className="mt-1 text-sm text-[#667085]">
            최대 {MAX_SEC}초. 어르신 폰에서 오늘 안에 재생돼요.
          </p>

          {/* 녹음 상태 표시 */}
          <div className="mt-6 flex flex-col items-center gap-4">
            {state === "recording" && (
              <div className="flex items-center gap-3">
                <span className="inline-block size-3 animate-pulse rounded-full bg-rose-500" />
                <span className="text-2xl font-bold tabular-nums text-[#101828]">
                  {formatTime(elapsed)} / {formatTime(MAX_SEC)}
                </span>
              </div>
            )}

            {(state === "stopped" || state === "done") && audioUrl && (
              <audio
                src={audioUrl}
                controls
                className="w-full"
                // Safari는 controls 없이는 autoPlay 막음 → controls 필수
              />
            )}

            {state === "done" && (
              <p className="text-center text-sm font-semibold text-emerald-600">
                전송됐어요. {parentName}이 오늘 들으실 거예요.
              </p>
            )}

            {(state === "error") && (
              <p className="text-center text-sm text-rose-600">{errorMsg}</p>
            )}
          </div>

          {/* 액션 버튼 */}
          <div className="mt-6 space-y-3">
            {state === "idle" && (
              <button
                onClick={startRecording}
                className="w-full rounded-xl bg-[#2E5BFF] py-4 text-base font-semibold text-white shadow-sm transition hover:bg-[#234AE0]"
              >
                🎙 녹음 시작
              </button>
            )}

            {state === "recording" && (
              <button
                onClick={stopRecording}
                className="w-full rounded-xl bg-rose-500 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-rose-600"
              >
                ⏹ 녹음 중지
              </button>
            )}

            {state === "stopped" && (
              <>
                <button
                  onClick={upload}
                  className="w-full rounded-xl bg-[#2E5BFF] py-4 text-base font-semibold text-white shadow-sm transition hover:bg-[#234AE0]"
                >
                  전송하기
                </button>
                <button
                  onClick={reset}
                  className="w-full rounded-xl border border-[#E7EBF3] py-4 text-base font-semibold text-[#344054] transition hover:bg-[#F5F7FB]"
                >
                  다시 녹음
                </button>
              </>
            )}

            {state === "uploading" && (
              <button disabled className="w-full rounded-xl bg-[#E7EBF3] py-4 text-base font-semibold text-[#98A2B3]">
                전송 중...
              </button>
            )}

            {(state === "done" || state === "error") && (
              <button
                onClick={reset}
                className="w-full rounded-xl border border-[#E7EBF3] py-4 text-base font-semibold text-[#344054] transition hover:bg-[#F5F7FB]"
              >
                새 메시지 녹음
              </button>
            )}
          </div>
        </div>

        {/* 보낸 메시지 목록 */}
        {messages.length > 0 && (
          <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-[#E7EBF3]">
            <h2 className="mb-4 text-sm font-semibold text-[#344054]">최근 보낸 메시지</h2>
            <ul className="space-y-3">
              {messages.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between rounded-xl bg-[#F5F7FB] px-4 py-3"
                >
                  <div>
                    <span className="text-sm font-medium text-[#101828]">
                      {formatTime(m.duration_sec)} 메시지
                    </span>
                    <span className="ml-2 text-xs text-[#667085]">
                      {new Date(m.created_at).toLocaleDateString("ko-KR", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      m.is_played
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {m.is_played ? "재생됨" : "대기 중"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
