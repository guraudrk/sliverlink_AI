"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

// 로그인/가입 두 폼이 똑같이 쓴다 — Google 입장에서는 "로그인"과 "가입"이 분리된 동작이 아니라
// signInWithOAuth 하나로 통일된다(처음 보는 계정이면 자동으로 새 회원이 생성됨).
export function GoogleSignInButton() {
  const [isRedirecting, setIsRedirecting] = useState(false);

  async function handleClick() {
    setIsRedirecting(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    // 성공 시 브라우저가 Google로 즉시 리다이렉트되므로 이 아래 코드는 보통 실행되지 않는다.
    // (provider 설정이 안 돼 있는 등 즉시 실패하는 경우에만 버튼이 다시 눌릴 수 있게 풀어준다)
    setIsRedirecting(false);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isRedirecting}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 text-base font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <GoogleLogo className="h-5 w-5" />
      {isRedirecting ? "이동하는 중..." : "Google로 계속하기"}
    </button>
  );
}

function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20.5H24v7h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.1 8 3l5-5C33.6 6.1 29.1 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l5.7 4.2C13.5 15.1 18.4 12 24 12c3.1 0 5.9 1.1 8 3l5-5C33.6 6.1 29.1 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5 0 9.5-1.9 13-5.1l-5.9-4.9C29.2 35.6 26.7 36.5 24 36.5c-5.3 0-9.7-3.4-11.3-8.1l-5.9 4.5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20.5H24v7h11.3c-.8 2.2-2.2 4.1-4.1 5.5l5.9 4.9C40.7 35 44 30 44 24c0-1.2-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}
