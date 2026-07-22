"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CallRecording } from "@/lib/supabase/call-recordings-repo";
import type { SafetySignal } from "@/lib/silverlink/audio/audio-analyzer";
import type { ParentProfile } from "@/lib/supabase/parent-profiles-repo";
import { WebRecorder } from "@/components/app/web-recorder";

const SIGNAL_LABELS: Record<string, string> = {
  physical: "🩺 신체",
  emotional: "💛 정서",
  cognitive: "🧠 인지",
  nutrition: "🍱 영양",
  medication: "💊 약",
  safety: "🏠 안전",
  social: "🤝 사회",
};

const RISK_CONFIG = {
  none:   { label: "이상 없음",   cls: "font-semibold rounded-full px-2 py-0.5 text-xs", style: { backgroundColor: "#ECFDF3", color: "#087443" } },
  low:    { label: "가벼운 주의", cls: "font-semibold rounded-full px-2 py-0.5 text-xs", style: { backgroundColor: "#FFFAEB", color: "#93370D" } },
  medium: { label: "관심 필요",   cls: "font-semibold rounded-full px-2 py-0.5 text-xs", style: { backgroundColor: "#FFFAEB", color: "#93370D" } },
  high:   { label: "즉각 확인",   cls: "font-semibold rounded-full px-2 py-0.5 text-xs", style: { backgroundColor: "#FEF3F2", color: "#B42318" } },
};

const STATUS_CONFIG: Record<string, { label: string; cls: string; style?: React.CSSProperties }> = {
  pending:      { label: "처리 중",    cls: "font-semibold rounded-full px-2 py-0.5 text-xs", style: { backgroundColor: "#F5F7FB", color: "#667085" } },
  transcribing: { label: "처리 중",    cls: "font-semibold rounded-full px-2 py-0.5 text-xs animate-pulse", style: { backgroundColor: "#EEF2FF", color: "#2E5BFF" } },
  analyzed:     { label: "분석 완료",  cls: "font-semibold rounded-full px-2 py-0.5 text-xs", style: { backgroundColor: "#ECFDF3", color: "#087443" } },
  failed:       { label: "오류",       cls: "font-semibold rounded-full px-2 py-0.5 text-xs", style: { backgroundColor: "#FEF3F2", color: "#B42318" } },
};

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const time = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  if (isToday) return `오늘 ${time}`;
  return `${d.getMonth() + 1}/${d.getDate()} ${time}`;
}

function formatDuration(sec: number | null) {
  if (!sec) return "—";
  if (sec < 60) return `${sec}초`;
  return `${Math.floor(sec / 60)}분 ${sec % 60}초`;
}

type Props = {
  initialRecordings: CallRecording[];
  parents: Pick<ParentProfile, "id" | "display_name" | "relationship">[];
};

export function CallsClient({ initialRecordings, parents }: Props) {
  const router = useRouter();
  const [recordings, setRecordings] = useState<CallRecording[]>(initialRecordings);
  const [analyzing, setAnalyzing] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  async function handleSeed() {
    setSeeding(true);
    try {
      const res = await fetch("/api/recordings/seed", { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        alert("예시 데이터 생성 실패: " + (json.error ?? "알 수 없는 오류"));
        return;
      }
      router.refresh();
    } finally {
      setSeeding(false);
    }
  }

  async function handleAnalyze(id: string) {
    setAnalyzing((prev) => ({ ...prev, [id]: true }));
    setRecordings((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "transcribing" } : r))
    );

    try {
      const res = await fetch("/api/recordings/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recording_id: id }),
      });
      const json = await res.json();

      if (!res.ok) {
        alert("분석 실패: " + (json.error ?? "알 수 없는 오류"));
        setRecordings((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status: "failed" } : r))
        );
        return;
      }

      const result = json.result;
      setRecordings((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                status: "analyzed",
                transcript: result.transcript,
                ai_summary: JSON.stringify({
                  summary: result.summary,
                  signals: result.signals,
                }),
                risk_level: result.risk_level,
              }
            : r
        )
      );
      setExpanded(id);
    } finally {
      setAnalyzing((prev) => ({ ...prev, [id]: false }));
    }
  }

  function parseAiSummary(raw: string | null): { summary: string; signals: SafetySignal[] } | null {
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }

  if (recordings.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center px-4 py-12" style={{ backgroundColor: "var(--sl-bg)" }}>
        <div className="w-full max-w-sm space-y-4">
          <WebRecorder parents={parents} onUploaded={() => router.refresh()} />
          <div className="rounded-2xl p-8 text-center space-y-3" style={{ backgroundColor: "var(--sl-card)", border: "1px solid var(--sl-border)" }}>
            <p className="text-4xl">📂</p>
            <p className="text-base font-semibold" style={{ color: "#344054" }}>아직 녹음 기록이 없어요</p>
            <p className="text-sm" style={{ color: "#667085" }}>위에서 녹음을 시작하거나 예시 데이터를 추가해 보세요.</p>
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="w-full rounded-xl border border-dashed py-3 text-sm font-semibold disabled:opacity-50"
              style={{ borderColor: "#B9C8FF", backgroundColor: "#EEF2FF", color: "#2E5BFF" }}
            >
              {seeding ? "생성 중..." : "예시 데이터 3개 추가"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col px-4 py-8 sm:px-8" style={{ backgroundColor: "var(--sl-bg)" }}>
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest" style={{ color: "#2E5BFF" }}>SilverLink AI</p>
            <h1 className="mt-1 text-2xl font-bold" style={{ color: "var(--sl-ink)" }}>통화 기록 · 통화 내용 정리</h1>
            <p className="mt-1 text-sm" style={{ color: "var(--sl-muted)" }}>녹음별로 통화 내용 정리를 요청하고 안전 신호를 확인하세요.</p>
          </div>
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="shrink-0 rounded-xl border border-dashed px-4 py-2 text-xs font-semibold disabled:opacity-50"
            style={{ borderColor: "#B9C8FF", backgroundColor: "#fff", color: "#667085" }}
          >
            {seeding ? "생성 중..." : "예시"}
          </button>
        </div>

        {/* 웹 녹음 패널 */}
        <div className="mb-6">
          <WebRecorder
            parents={parents}
            onUploaded={() => router.refresh()}
          />
        </div>

        <ul className="space-y-3">
          {recordings.map((rec) => {
            const status = STATUS_CONFIG[rec.status] ?? STATUS_CONFIG.pending;
            const risk = rec.risk_level ? RISK_CONFIG[rec.risk_level] : null;
            const isExpanded = expanded === rec.id;
            const parsed = parseAiSummary(rec.ai_summary);
            const isAnalyzing = analyzing[rec.id];

            return (
              <li key={rec.id} className="overflow-hidden rounded-2xl" style={{ backgroundColor: "var(--sl-card)", border: "1px solid var(--sl-border)" }}>
                {/* 카드 헤더 */}
                <div className="flex items-center gap-3 p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold" style={{ color: "var(--sl-ink)" }}>
                        {rec.parent_display_name ?? "알 수 없음"}
                      </span>
                      {rec.parent_relation && (
                        <span className="text-xs" style={{ color: "#98A2B3" }}>{rec.parent_relation}</span>
                      )}
                      <span className={status.cls} style={status.style}>{status.label}</span>
                      {risk && <span className={risk.cls} style={risk.style}>{risk.label}</span>}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs" style={{ color: "#98A2B3" }}>
                      <span>{formatDate(rec.recorded_at)}</span>
                      <span>·</span>
                      <span>{formatDuration(rec.duration_sec)}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    {(rec.status === "pending" || rec.status === "failed") && (
                      <button
                        onClick={() => handleAnalyze(rec.id)}
                        disabled={isAnalyzing}
                        className="rounded-xl px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                        style={{ backgroundColor: "#2E5BFF" }}
                      >
                        {isAnalyzing ? "분석 중..." : "통화 내용 정리"}
                      </button>
                    )}
                    {rec.status === "transcribing" && (
                      <span className="animate-pulse rounded-xl px-3 py-1.5 text-xs font-semibold" style={{ backgroundColor: "#EEF2FF", color: "#2E5BFF" }}>
                        분석 중...
                      </span>
                    )}
                    {rec.status === "analyzed" && (
                      <button
                        onClick={() => setExpanded(isExpanded ? null : rec.id)}
                        className="rounded-xl px-3 py-1.5 text-xs font-semibold"
                        style={{ backgroundColor: "#F5F7FB", color: "#475467" }}
                      >
                        {isExpanded ? "접기" : "결과 보기"}
                      </button>
                    )}
                  </div>
                </div>

                {/* 분석 결과 확장 패널 */}
                {isExpanded && parsed && (
                  <div className="space-y-4 border-t p-4" style={{ borderColor: "#F0F3F9", backgroundColor: "#F9FAFD" }}>
                    <div>
                      <p className="mb-1 text-xs font-bold uppercase tracking-widest" style={{ color: "#98A2B3" }}>통화 요약</p>
                      <p className="text-sm leading-relaxed" style={{ color: "#344054" }}>{parsed.summary}</p>
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-bold uppercase tracking-widest" style={{ color: "#98A2B3" }}>안전 신호</p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                        {parsed.signals.map((sig) => (
                          <div
                            key={sig.type}
                            className="rounded-xl p-3 text-xs"
                            style={sig.detected
                              ? { backgroundColor: "#FFFAEB", border: "1px solid #FEC84B" }
                              : { backgroundColor: "#fff", border: "1px solid #E7EBF3" }}
                          >
                            <div className="font-semibold" style={{ color: sig.detected ? "#93370D" : "#475467" }}>
                              {SIGNAL_LABELS[sig.type] ?? sig.type}
                            </div>
                            {sig.note && (
                              <div className="mt-1 leading-relaxed" style={{ color: sig.detected ? "#B54708" : "#98A2B3" }}>
                                {sig.note}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {rec.transcript && (
                      <div>
                        <p className="mb-1 text-xs font-bold uppercase tracking-widest" style={{ color: "#98A2B3" }}>전사</p>
                        <p className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-xl p-3 text-xs leading-relaxed" style={{ backgroundColor: "#fff", border: "1px solid #E7EBF3", color: "#475467" }}>
                          {rec.transcript}
                        </p>
                      </div>
                    )}

                    {rec.risk_level === "high" && (
                      <div className="flex items-center justify-between gap-3 rounded-xl px-4 py-3" style={{ backgroundColor: "#FEF3F2", border: "1px solid #FECDCA" }}>
                        <div>
                          <p className="text-sm font-semibold" style={{ color: "#B42318" }}>즉각 확인이 필요한 신호가 감지됐어요</p>
                          <p className="mt-0.5 text-xs" style={{ color: "#F04438" }}>케어 태스크를 만들어 후속 조치를 기록하세요.</p>
                        </div>
                        <a
                          href={`/dashboard/create-task?parentId=${rec.parent_id}`}
                          className="shrink-0 rounded-xl px-3 py-2 text-xs font-bold text-white"
                          style={{ backgroundColor: "#F04438" }}
                        >
                          태스크 만들기
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
