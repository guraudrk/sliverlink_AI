"use client";

import Link from "next/link";
import { NavPageGuide } from "./nav-page-guide";
import type { UserRole } from "@/app/api/user/role/route";

type Props = { role?: UserRole };

export function DashboardNavBar({ role }: Props) {
  return (
    <div className="w-full border-b border-slate-200 bg-white px-4 py-3">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-blue-600"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          대시보드로
        </Link>
        <NavPageGuide />
        {role === "caseworker" && (
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-700 ring-1 ring-teal-200 transition-colors hover:bg-teal-100"
            title="설정에서 역할 변경 가능"
          >
            🏥 복지사 모드
          </Link>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/dashboard/settings"
            className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            title="설정"
            aria-label="설정"
          >
            <GearIcon className="h-4 w-4" />
          </Link>
          <Link
            href="/dashboard/references"
            className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-400 ring-1 ring-slate-200 transition-colors hover:bg-slate-50 hover:text-slate-600"
            title="학술 참조 — 이 서비스가 참고한 논문"
          >
            <BookOpenIcon className="h-3.5 w-3.5" />
            참조
          </Link>
        </div>
      </div>
    </div>
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

function BookOpenIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M10.75 16.82A7.462 7.462 0 0115 15.5c.71 0 1.396.098 2.046.282A.75.75 0 0018 15.06v-11a.75.75 0 00-.546-.721A9.006 9.006 0 0015 3a8.963 8.963 0 00-4.25 1.065V16.82zM9.25 4.065A8.963 8.963 0 005 3c-.85 0-1.673.118-2.454.339A.75.75 0 002 4.06v11a.75.75 0 00.954.721A7.506 7.506 0 015 15.5c1.579 0 3.042.487 4.25 1.32V4.065z" />
    </svg>
  );
}

function GearIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" {...props}>
      <path fillRule="evenodd" d="M7.84 1.804A1 1 0 018.82 1h2.36a1 1 0 01.98.804l.331 1.652a6.993 6.993 0 011.929 1.115l1.598-.54a1 1 0 011.186.447l1.18 2.044a1 1 0 01-.205 1.251l-1.267 1.113a7.047 7.047 0 010 2.228l1.267 1.113a1 1 0 01.206 1.25l-1.18 2.045a1 1 0 01-1.187.447l-1.598-.54a6.993 6.993 0 01-1.929 1.115l-.33 1.652a1 1 0 01-.98.804H8.82a1 1 0 01-.98-.804l-.331-1.652a6.993 6.993 0 01-1.929-1.115l-1.598.54a1 1 0 01-1.186-.447l-1.18-2.044a1 1 0 01.205-1.251l1.267-1.114a7.05 7.05 0 010-2.227L1.821 7.773a1 1 0 01-.206-1.25l1.18-2.045a1 1 0 011.187-.447l1.598.54A6.993 6.993 0 017.51 3.456l.33-1.652zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
    </svg>
  );
}
