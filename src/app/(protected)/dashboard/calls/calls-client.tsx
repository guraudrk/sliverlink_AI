"use client";

import { useState } from "react";
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
  none: { label: "이상 없음", cls: "bg-green-100 text-green-700" },
  low: { label: "가벼운 주의", cls: "bg-yellow-100 text-yellow-700" },
  medium: { label: "관심 필요", cls: "bg-orange-100 text-orange-700" },
  high: { label: "즉각 확인", cls: "bg-red-100 text-red-700" },
};

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  pending: { label: "대기 중", cls: "bg-slate-100 text-slate-600" },
  transcribing: { label: "분석 중", cls: "bg-blue-100 text-blue-700" },
  analyzed: { label: "분석 완료", cls: "bg-green-100 text-green-700" },
  failed: { label: "실패", cls: "bg-red-100 text-red-700" },
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
      window.location.reload();
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
      <div className="flex flex-1 flex-col items-center bg-slate-50 px-4 py-12">
        <div className="w-full max-w-sm space-y-4">
          <WebRecorder
            parents={parents}
            onUploaded={() => window.location.reload()}
          />
          <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200 text-center space-y-3">
            <p className="text-4xl">📂</p>
            <p className="text-base font-semibold text-slate-700">아직 녹음 기록이 없어요</p>
            <p className="text-sm text-slate-500">위에서 녹음을 시작하거나 예시 데이터를 추가해 보세요.</p>
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="w-full rounded-xl border border-dashed border-blue-300 bg-blue-50 py-3 text-sm font-semibold text-blue-600 hover:bg-blue-100 disabled:opacity-50"
            >
              {seeding ? "생성 중..." : "🧪 예시 데이터 3개 추가"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-slate-50 px-4 py-8 sm:px-8">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">SilverLink AI</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">통화 녹음 · AI 분석</h1>
            <p className="mt-1 text-sm text-slate-500">녹음별로 AI 분석을 요청하고 안전 신호를 확인하세요.</p>
          </div>
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="shrink-0 rounded-xl border border-dashed border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-500 hover:border-blue-300 hover:text-blue-600 disabled:opacity-50"
          >
            {seeding ? "생성 중..." : "🧪 예시"}
          </button>
        </div>

        {/* 웹 녹음 패널 */}
        <div className="mb-6">
          <WebRecorder
            parents={parents}
            onUploaded={() => window.location.reload()}
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
              <li key={rec.id} className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden">
                {/* 카드 헤더 */}
                <div className="flex items-center gap-3 p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-800">
                        {rec.parent_display_name ?? "알 수 없음"}
                      </span>
                      {rec.parent_relation && (
                        <span className="text-xs text-slate-400">{rec.parent_relation}</span>
                      )}
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${status.cls}`}>
                        {status.label}
                      </span>
                      {risk && (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${risk.cls}`}>
                          {risk.label}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                      <span>{formatDate(rec.recorded_at)}</span>
                      <span>·</span>
                      <span>{formatDuration(rec.duration_sec)}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    {rec.status === "pending" || rec.status === "failed" ? (
                      <button
                        onClick={() => handleAnalyze(rec.id)}
                        disabled={isAnalyzing}
                        className="rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {isAnalyzing ? "분석 중..." : "AI 분석"}
                      </button>
                    ) : rec.status === "transcribing" ? (
                      <span className="rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 animate-pulse">
                        분석 중...
                      </span>
                    ) : null}

                    {rec.status === "analyzed" && (
                      <button
                        onClick={() => setExpanded(isExpanded ? null : rec.id)}
                        className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200"
                      >
                        {isExpanded ? "접기" : "결과 보기"}
                      </button>
                    )}
                  </div>
                </div>

                {/* 분석 결과 확장 패널 */}
                {isExpanded && parsed && (
                  <div className="border-t border-slate-100 p-4 space-y-4 bg-slate-50">
                    {/* 요약 */}
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">AI 요약</p>
                      <p className="text-sm text-slate-700 leading-relaxed">{parsed.summary}</p>
                    </div>

                    {/* 안전 신호 */}
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">안전 신호</p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                        {parsed.signals.map((sig) => (
                          <div
                            key={sig.type}
                            className={`rounded-xl p-3 text-xs ${
                              sig.detected
                                ? "bg-orange-50 ring-1 ring-orange-200"
                                : "bg-white ring-1 ring-slate-200"
                            }`}
                          >
                            <div className={`font-semibold ${sig.detected ? "text-orange-700" : "text-slate-500"}`}>
                              {SIGNAL_LABELS[sig.type] ?? sig.type}
                            </div>
                            {sig.note && (
                              <div className={`mt-1 leading-relaxed ${sig.detected ? "text-orange-600" : "text-slate-400"}`}>
                                {sig.note}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 전사 */}
                    {rec.transcript && (
                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">전사</p>
                        <p className="whitespace-pre-wrap text-xs text-slate-600 leading-relaxed bg-white rounded-xl p-3 ring-1 ring-slate-200 max-h-40 overflow-y-auto">
                          {rec.transcript}
                        </p>
                      </div>
                    )}

                    {/* 즉각 확인 필요 시 케어 태스크 생성 버튼 */}
                    {rec.risk_level === "high" && (
                      <div className="rounded-xl bg-red-50 px-4 py-3 ring-1 ring-red-200 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-red-700">⚠️ 즉각 확인이 필요한 신호가 감지됐어요</p>
                          <p className="text-xs text-red-500 mt-0.5">케어 태스크를 만들어 후속 조치를 기록하세요.</p>
                        </div>
                        <a
                          href={`/dashboard/create-task?parentId=${rec.parent_id}`}
                          className="shrink-0 rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-700"
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
