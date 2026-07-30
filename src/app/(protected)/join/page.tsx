"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * /join?token=...
 * 로그인 상태에서 초대 토큰을 처리한다.
 * 미로그인이면 /login?next=/join?token=... 으로 리다이렉트.
 */
export default function JoinPage() {
  const router = useRouter();
  const params = useSearchParams();
  const token  = params.get("token");

  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMsg("초대 링크가 올바르지 않습니다.");
      return;
    }

    fetch("/api/org/join", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ token }),
    })
      .then(async (res) => {
        if (res.status === 401) {
          // 미로그인 → 로그인 후 다시 돌아오게
          router.replace(`/login?next=/join?token=${token}`);
          return;
        }
        if (!res.ok) {
          const text = await res.text();
          const msgs: Record<string, string> = {
            invalid_token:     "유효하지 않은 초대 링크입니다.",
            token_already_used: "이미 사용된 초대 링크입니다.",
            token_expired:     "만료된 초대 링크입니다. 관리자에게 재초대를 요청하세요.",
          };
          setStatus("error");
          setMsg(msgs[text] ?? "초대 처리 중 오류가 발생했습니다.");
          return;
        }
        setStatus("success");
        setTimeout(() => router.replace("/dashboard/caseworker"), 2000);
      })
      .catch(() => {
        setStatus("error");
        setMsg("네트워크 오류가 발생했습니다. 다시 시도해 주세요.");
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white px-8 py-10 text-center shadow-sm ring-1 ring-slate-200">
        {status === "processing" && (
          <>
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
            <p className="text-slate-600">초대를 처리하는 중입니다…</p>
          </>
        )}
        {status === "success" && (
          <>
            <p className="mb-2 text-3xl">✅</p>
            <p className="font-semibold text-slate-800">기관에 편입됐습니다!</p>
            <p className="mt-1 text-sm text-slate-400">대시보드로 이동합니다…</p>
          </>
        )}
        {status === "error" && (
          <>
            <p className="mb-2 text-3xl">⚠️</p>
            <p className="font-semibold text-slate-800">초대 처리 실패</p>
            <p className="mt-1 text-sm text-slate-500">{msg}</p>
            <button
              onClick={() => router.replace("/dashboard")}
              className="mt-6 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              대시보드로 이동
            </button>
          </>
        )}
      </div>
    </div>
  );
}
