"use client";

import { useState } from "react";
import type { UserRole } from "@/app/api/user/role/route";

type Props = { initialRole: UserRole };

const ROLE_INFO: Record<UserRole, { label: string; sub: string; icon: string }> = {
  family: {
    label: "가족·보호자",
    sub: "부모님/어르신의 케어를 챙기는 가족 또는 보호자",
    icon: "🏠",
  },
  caseworker: {
    label: "사회복지사",
    sub: "여러 어르신을 담당하는 사회복지사 또는 케어 매니저",
    icon: "🏥",
  },
};

export function RoleToggle({ initialRole }: Props) {
  const [role, setRole] = useState<UserRole>(initialRole);

  function handleSelect(next: UserRole) {
    if (next === role) return;
    // 옵티미스틱 업데이트: 서버 응답 전에 즉시 UI 반영
    setRole(next);
    fetch("/api/user/role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: next }),
    }).then((res) => {
      if (!res.ok) setRole(role); // 실패 시 롤백
    }).catch(() => setRole(role));
  }

  return (
    <div className="space-y-3">
      {(["family", "caseworker"] as UserRole[]).map((r) => {
        const info = ROLE_INFO[r];
        const isSelected = role === r;
        return (
          <button
            key={r}
            type="button"
            onClick={() => handleSelect(r)}
            className={`w-full rounded-2xl px-5 py-4 text-left transition-all duration-150 ${
              isSelected
                ? "bg-blue-600 text-white shadow-md ring-0 scale-[1.01]"
                : "bg-white text-slate-700 ring-1 ring-slate-200 hover:ring-blue-300 hover:shadow-sm"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{info.icon}</span>
              <div>
                <p className={`font-bold ${isSelected ? "text-white" : "text-slate-800"}`}>
                  {info.label}
                </p>
                <p className={`mt-0.5 text-sm ${isSelected ? "text-blue-100" : "text-slate-400"}`}>
                  {info.sub}
                </p>
              </div>
              {isSelected && (
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="ml-auto h-5 w-5 shrink-0 text-white"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
