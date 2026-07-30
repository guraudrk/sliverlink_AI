"use client";

import { useState, useMemo } from "react";
import { SocialScoreCard } from "./social-score-card";
import type { SocialScore } from "@/lib/supabase/social-scores-repo";

type ParentWithScores = {
  id: string;
  display_name: string;
  scores: SocialScore[];
  latestScore: number | null;
};

type SortType = "default" | "asc" | "desc";

export function SocialScoreList({ items }: { items: ParentWithScores[] }) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortType>("default");

  const filtered = useMemo(() => {
    let result = items;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((p) => p.display_name.toLowerCase().includes(q));
    }
    if (sort === "asc") {
      result = [...result].sort((a, b) => (a.latestScore ?? -1) - (b.latestScore ?? -1));
    } else if (sort === "desc") {
      result = [...result].sort((a, b) => (b.latestScore ?? -1) - (a.latestScore ?? -1));
    }
    return result;
  }, [items, search, sort]);

  return (
    <>
      {/* 검색 + 정렬 */}
      <div className="flex gap-2 animate-rag-fade-in-up">
        <div className="relative flex-1">
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
              clipRule="evenodd"
            />
          </svg>
          <input
            type="search"
            placeholder="이름 검색…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-800 placeholder-slate-400 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <div className="flex gap-1.5">
          {(["default", "desc", "asc"] as SortType[]).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                sort === s
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-blue-300"
              }`}
            >
              {s === "default" ? "기본" : s === "desc" ? "높은 순" : "낮은 순"}
            </button>
          ))}
        </div>
      </div>

      {/* 점수 카드 목록 */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-white px-8 py-10 text-center shadow-sm ring-1 ring-slate-200">
          <p className="text-slate-400">검색 결과가 없어요.</p>
        </div>
      ) : (
        filtered.map((p, i) => (
          <div
            key={p.id}
            className="animate-rag-fade-in-up"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <SocialScoreCard parentName={p.display_name} scores={p.scores} />
          </div>
        ))
      )}
    </>
  );
}
