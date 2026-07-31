"use client";

import { useState, useRef, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { ParentProfile } from "@/lib/supabase/parent-profiles-repo";

type Props = {
  parents: Pick<ParentProfile, "id" | "display_name" | "relationship" | "phone">[];
  onUploaded: () => void;
  initialParentId?: string;
  autoFocus?: boolean;
};

export function WebRecorder({ parents, onUploaded, initialParentId, autoFocus }: Props) {
  const [parentId, setParentId] = useState(initialParentId ?? parents[0]?.id ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [autoMatched, setAutoMatched] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // 항상 최신 handleFile 을 가리켜서 stale closure 방지
  const handleFileRef = useRef<(file: File) => Promise<void>>(async () => {});

  async function handleFile(file: File) {
    let activeParentId = parentId;

    // S2.2: 딥링크로 어르신이 지정되지 않은 경우 파일명에서 전화번호 9자리로 자동 매칭
    if (!initialParentId) {
      const digits = file.name.replace(/\D/g, "");
      const match = parents.find((p) => {
        const phone = (p.phone ?? "").replace(/\D/g, "");
        return phone.length >= 9 && digits.includes(phone.slice(-9));
      });
      if (match) {
        activeParentId = match.id;
        setParentId(match.id);
        setAutoMatched(match.display_name ?? "어르신");
      }
    }

    if (!activeParentId) { setError("어르신을 선택해주세요."); return; }

    setUploading(true);
    setError(null);
    setSuccess(false);

    let duration = 0;
    try {
      const url = URL.createObjectURL(file);
      await new Promise<void>((resolve) => {
        const audio = new Audio(url);
        audio.onloadedmetadata = () => { duration = Math.round(audio.duration); URL.revokeObjectURL(url); resolve(); };
        audio.onerror = () => { URL.revokeObjectURL(url); resolve(); };
      });
    } catch {}

    const supabase = createSupabaseBrowserClient();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("로그인이 필요합니다.");

      const ext = file.name.split(".").pop() ?? "m4a";
      const storagePath = `${user.id}/${activeParentId}/${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("call-recordings")
        .upload(storagePath, file, { contentType: file.type });

      if (uploadErr) throw new Error(`업로드 실패: ${uploadErr.message}`);

      // S2.3: insert 후 recording ID 를 받아서 분석 자동 시작
      const { data: insertData, error: insertErr } = await supabase
        .from("call_recordings")
        .insert({
          owner_user_id: user.id,
          parent_id: activeParentId,
          storage_path: storagePath,
          duration_sec: duration,
          status: "pending",
          recorded_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (insertErr || !insertData) throw new Error(`저장 실패: ${insertErr?.message}`);

      // fire-and-forget — 실패해도 목록의 [통화 내용 정리] 버튼으로 재시도 가능
      fetch("/api/recordings/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recording_id: insertData.id }),
      }).catch(() => {});

      setSuccess(true);
      if (fileInputRef.current) fileInputRef.current.value = "";
      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류");
    } finally {
      setUploading(false);
    }
  }

  // 항상 최신 버전 유지
  handleFileRef.current = handleFile;

  // 파일 선택 버튼 자동 포커스 (from=call 딥링크)
  useEffect(() => {
    if (!autoFocus) return;
    const timer = setTimeout(() => fileInputRef.current?.focus(), 300);
    return () => clearTimeout(timer);
  }, [autoFocus]);

  // S2.1: 네이티브 앱 공유 인텐트에서 온 오디오 파일 처리
  useEffect(() => {
    function handleSharedAudio() {
      const data = (window as any).__slPendingAudio as { base64: string; filename: string } | undefined;
      if (!data) return;
      delete (window as any).__slPendingAudio;
      const bytes = Uint8Array.from(atob(data.base64), (c) => c.charCodeAt(0));
      const blob = new Blob([bytes], { type: "audio/m4a" });
      const file = new File([blob], data.filename, { type: "audio/m4a" });
      void handleFileRef.current(file);
    }

    window.addEventListener("sl:audioReady", handleSharedAudio);
    // 이미 주입돼 있는 경우 (onLoadEnd 가 먼저 발생한 경우)
    if (typeof window !== "undefined" && (window as any).__slPendingAudio) handleSharedAudio();
    return () => window.removeEventListener("sl:audioReady", handleSharedAudio);
  }, []);

  return (
    <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-slate-100">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-lg">📁</div>
        <div>
          <p className="text-sm font-bold text-slate-800">녹음 파일 업로드</p>
          <p className="text-xs text-slate-400">통화 녹음 파일을 올리면 AI가 건강 신호를 분석합니다</p>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <select
          value={parentId}
          onChange={(e) => { setParentId(e.target.value); setAutoMatched(null); }}
          disabled={uploading}
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

        {autoMatched && (
          <p className="text-xs font-medium" style={{ color: "#0E7A3A" }}>
            {autoMatched}님으로 자동 선택했어요 (변경 가능)
          </p>
        )}

        <label
          className={`flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed py-6 transition-colors ${
            uploading || parents.length === 0
              ? "cursor-not-allowed border-slate-200 opacity-50"
              : "border-violet-200 hover:border-violet-400 hover:bg-violet-50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,.m4a,.mp3,.wav,.ogg,.webm,.mp4"
            disabled={uploading || parents.length === 0}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
            className="hidden"
          />
          {uploading ? (
            <div className="flex items-center gap-2">
              <span className="h-4 w-4 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
              <span className="text-sm font-semibold text-violet-600">업로드 중...</span>
            </div>
          ) : (
            <>
              <span className="text-2xl">📂</span>
              <p className="mt-2 text-sm font-semibold text-slate-700">파일을 클릭해서 선택</p>
              <p className="mt-0.5 text-xs text-slate-400">m4a · mp3 · wav · ogg · webm 지원</p>
            </>
          )}
        </label>

        {success && (
          <p className="rounded-xl bg-emerald-50 px-3 py-2.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
            ✓ 업로드 완료! AI 분석을 시작했습니다.
          </p>
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
