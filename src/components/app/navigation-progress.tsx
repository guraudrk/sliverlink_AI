"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type NavState = "idle" | "loading" | "finishing";

export function NavigationProgress() {
  const pathname = usePathname();
  const prevPathnameRef = useRef(pathname);
  const [state, setState] = useState<NavState>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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
      setState("loading");
    };
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [pathname]);

  // pathname 변경 감지 → 완료 처리
  useEffect(() => {
    if (pathname === prevPathnameRef.current) return;
    prevPathnameRef.current = pathname;
    clearTimeout(timerRef.current);
    setState("finishing");
    timerRef.current = setTimeout(() => setState("idle"), 450);
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

      {/* 스피너 뱃지 — 모바일: 바텀내비 위쪽 / 데스크톱: 우상단 */}
      {state === "loading" && (
        <div
          className="pointer-events-none fixed bottom-[4.5rem] right-4 z-[9999] sm:bottom-auto sm:right-4 sm:top-[3.75rem]"
          aria-hidden
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-slate-100">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-blue-500" />
          </div>
        </div>
      )}
    </>
  );
}
