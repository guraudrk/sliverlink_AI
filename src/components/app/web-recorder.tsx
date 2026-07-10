"use client";

import { useState, useRef, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { ParentProfile } from "@/lib/supabase/parent-profiles-repo";

type Props = {
  parents: Pick<ParentProfile, "id" | "display_name" | "relationship">[];
  onUploaded: () => void;
};

function formatSec(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function WebRecorder({ parents, onUploaded }: Props) {
  const [parentId, setParentId] = useState(parents[0]?.id ?? "");
  const [phase, setPhase] = useState<"idle" | "recording" | "uploading">("idle");
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationRef = useRef(0);

  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  async function start() {
    setError(null);
    if (!parentId) { setError("어르신을 선택해주세요."); return; }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("마이크 권한이 필요합니다. 브라우저 주소창 옆 자물쇠를 눌러 허용해주세요.");
      return;
    }

    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";

    const recorder = new MediaRecorder(stream, { mimeType });
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunksRef.current, { type: mimeType });
      upload(blob, mimeType, durationRef.current);
    };

    recorder.start(1000);
    recorderRef.current = recorder;
    setDuration(0);
    setPhase("recording");

    timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
  }

  function stop() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    recorderRef.current?.stop();
    recorderRef.current = null;
    setPhase("uploading");
  }

  async function upload(blob: Blob, mimeType: string, sec: number) {
    const supabase = createSupabaseBrowserClient();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("로그인이 필요합니다.");

      const ext = mimeType.includes("webm") ? "webm" : "m4a";
      const storagePath = `${user.id}/${parentId}/${Date.now()}.${ext}`;

      const arrayBuffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      const { error: uploadErr } = await supabase.storage
        .from("call-recordings")
        .upload(storagePath, bytes, { contentType: mimeType });

      if (uploadErr) throw new Error(`Storage 업로드 실패: ${uploadErr.message}`);

      const { error: insertErr } = await supabase.from("call_recordings").insert({
        owner_user_id: user.id,
        parent_id: parentId,
        storage_path: storagePath,
        duration_sec: sec,
        status: "pending",
        recorded_at: new Date().toISOString(),
      });

      if (insertErr) throw new Error(`저장 실패: ${insertErr.message}`);

      setPhase("idle");
      setDuration(0);
      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류");
      setPhase("idle");
    }
  }

  return (
    <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-slate-100">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-lg">🎙️</div>
        <div>
          <p className="text-sm font-bold text-slate-800">새 녹음</p>
          <p className="text-xs text-slate-400">통화하며 녹음하면 AI가 건강 신호를 분석합니다</p>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* 어르신 선택 */}
        <select
          value={parentId}
          onChange={(e) => setParentId(e.target.value)}
          disabled={phase !== "idle"}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 focus:border-blue-400 focus:outline-none disabled:opacity-60"
        >
          {parents.length === 0 ? (
            <option value="">등록된 어르신이 없습니다</option>
          ) : (
            parents.map((p) => (
              <option key={p.id} value={p.id}>
                {p.display_name}{p.relationship ? ` (${p.relationship})` : ""}
              </option>
            ))
          )}
        </select>

        {/* 녹음 버튼 */}
        {phase === "idle" && (
          <button
            onClick={start}
            disabled={parents.length === 0}
            className="w-full rounded-xl bg-violet-600 py-3 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
          >
            🎙️ 녹음 시작
          </button>
        )}

        {phase === "recording" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-xl bg-red-50 px-4 py-3 ring-1 ring-red-200">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-sm font-semibold text-red-700">녹음 중</span>
              </div>
              <span className="font-mono text-sm font-bold text-red-600">{formatSec(duration)}</span>
            </div>
            <button
              onClick={stop}
              className="w-full rounded-xl bg-red-600 py-3 text-sm font-bold text-white hover:bg-red-700 transition-colors"
            >
              ⏹ 녹음 완료
            </button>
          </div>
        )}

        {phase === "uploading" && (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-blue-50 py-3 ring-1 ring-blue-200">
            <span className="h-4 w-4 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
            <span className="text-sm font-semibold text-blue-600">업로드 중...</span>
          </div>
        )}

        {error && (
          <p className="rounded-xl bg-red-50 px-3 py-2.5 text-xs text-red-600 ring-1 ring-red-200">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
