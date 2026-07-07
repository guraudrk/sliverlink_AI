"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RecalculateButton() {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [count, setCount] = useState(0);

  async function handleClick() {
    setState("loading");
    try {
      const res = await fetch("/api/social-scores", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setCount(data.recalculated);
        setState("done");
        router.refresh();
      } else {
        setState("error");
      }
    } catch {
      setState("error");
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleClick}
        disabled={state === "loading"}
        className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50"
      >
        {state === "loading" ? "계산 중…" : "기존 데이터 반영"}
      </button>
      {state === "done" && (
        <p className="text-sm text-emerald-600 font-medium">{count}주치 점수 반영 완료</p>
      )}
      {state === "error" && (
        <p className="text-sm text-rose-500">오류가 발생했어요. 다시 시도해 주세요.</p>
      )}
    </div>
  );
}
