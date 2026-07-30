"use client";

import { useState, useRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { ParentProfile } from "@/lib/supabase/parent-profiles-repo";

type Props = {
  parents: Pick<ParentProfile, "id" | "display_name" | "relationship">[];
  onUploaded: () => void;
};

export function WebRecorder({ parents, onUploaded }: Props) {
  const [parentId, setParentId] = useState(parents[0]?.id ?? "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!parentId) { setError("어르신을 선택해주세요."); return; }

    setUploading(true);
    setError(null);
    setSuccess(false);

    // 오디오 duration 추출 (실패해도 0으로 진행)
    let duration = 0;
    try {
      const url = URL.createObjectURL(file);
      await new Promise<void>((resolve) => {
        const audio = new Audio(url);
        audio.onloadedmetadata = () => {
          duration = Math.round(audio.duration);
          URL.revokeObjectURL(url);
          resolve();
        };
        audio.onerror = () => { URL.revokeObjectURL(url); resolve(); };
      });
    } catch {}

    const supabase = createSupabaseBrowserClient();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("로그인이 필요합니다.");

      const ext = file.name.split(".").pop() ?? "m4a";
      const storagePath = `${user.id}/${parentId}/${Date.now()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from("call-recordings")
        .upload(storagePath, file, { contentType: file.type });

      if (uploadErr) throw new Error(`업로드 실패: ${uploadErr.message}`);

      const { error: insertErr } = await supabase.from("call_recordings").insert({
        owner_user_id: user.id,
        parent_id: parentId,
        storage_path: storagePath,
        duration_sec: duration,
        status: "pending",
        recorded_at: new Date().toISOString(),
      });

      if (insertErr) throw new Error(`저장 실패: ${insertErr.message}`);

      setSuccess(true);
      if (fileInputRef.current) fileInputRef.current.value = "";
      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류");
    } finally {
      setUploading(false);
    }
  }

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
          onChange={(e) => setParentId(e.target.value)}
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
              if (file) handleFile(file);
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
            ✓ 업로드 완료! 목록에서 AI 분석을 시작하세요.
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
