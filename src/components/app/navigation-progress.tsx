"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type NavState = "idle" | "loading" | "finishing";

const MIN_SHOW_MS = 350;

export function NavigationProgress() {
  const pathname = usePathname();
  const prevPathnameRef = useRef(pathname);
  const [state, setState] = useState<NavState>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const loadStartRef = useRef<number>(0);

  // 내부 링크 클릭 감지 → loading 시작
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as Element).closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || !href.startsWith("/")) return;
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      const targetPath = href.split(/[?#]/)[0];
      if (targetPath === pathname) return;
      clearTimeout(timerRef.current);
      loadStartRef.current = Date.now();
      setState("loading");
    };
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [pathname]);

  // pathname 변경 감지 → 완료 처리 (최소 표시 시간 보장)
  useEffect(() => {
    if (pathname === prevPathnameRef.current) return;
    prevPathnameRef.current = pathname;
    clearTimeout(timerRef.current);
    const elapsed = Date.now() - loadStartRef.current;
    const delay = Math.max(0, MIN_SHOW_MS - elapsed);
    timerRef.current = setTimeout(() => {
      setState("finishing");
      timerRef.current = setTimeout(() => setState("idle"), 400);
    }, delay);
    return () => clearTimeout(timerRef.current);
  }, [pathname]);

  if (state === "idle") return null;

  return (
    <>
      {/* 최상단 진행 바 */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[9999]" aria-hidden>
        <div
          className={`h-0.5 origin-left bg-blue-500 ${
            state === "finishing"
              ? "w-full opacity-0 transition-opacity duration-300"
              : "animate-nav-bar-grow"
          }`}
        />
      </div>

      {/* 스피너 — 화면 정중앙 (인라인 스타일로 다크모드 재매핑 방지) */}
      {state === "loading" && (
        <div
          className="pointer-events-none fixed inset-0 z-[9999] flex items-center justify-center"
          aria-hidden
        >
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full backdrop-blur-sm"
            style={{ backgroundColor: "rgba(255,255,255,0.95)", boxShadow: "0 4px 20px rgba(0,0,0,0.18)", border: "1px solid rgba(0,0,0,0.06)" }}
          >
            <div
              className="h-7 w-7 animate-spin rounded-full"
              style={{ border: "3px solid #e2e8f0", borderTopColor: "#3b82f6" }}
            />
          </div>
        </div>
      )}
    </>
  );
}
