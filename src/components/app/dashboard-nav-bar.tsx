"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ParentGuideModal } from "./parent-guide-modal";

export function DashboardNavBar() {
  const pathname = usePathname();
  const showGuide =
    pathname.startsWith("/dashboard/parents") || pathname.startsWith("/parents");
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <>
      <div className="w-full border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-blue-600"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            대시보드로
          </Link>
          {showGuide && (
            <button
              type="button"
              onClick={() => setGuideOpen(true)}
              title="AI 알림 기능 가이드"
              className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 bg-slate-50 text-xs font-bold text-slate-400 transition-colors hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600"
            >
              ?
            </button>
          )}
        </div>
      </div>
      {guideOpen && <ParentGuideModal onClose={() => setGuideOpen(false)} />}
    </>
  );
}

function ArrowLeftIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" {...props}>
      <path
        fillRule="evenodd"
        d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z"
        clipRule="evenodd"
      />
    </svg>
  );
}
