"use client";

import { useState, type FormEvent, type SVGProps } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Status = "idle" | "submitting" | "success" | "error";

export function SignupForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const isSubmitting = status === "submitting";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setMessage(null);

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setStatus("error");
      setMessage(error.message || "회원가입에 실패했어요. 다시 시도해 주세요.");
      return;
    }

    setStatus("success");
    setMessage("회원가입 요청을 받았어요. 이메일 확인 안내가 있다면 확인 후 로그인해 주세요.");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-3xl bg-white p-8 shadow-sm ring-1 ring-slate-200 sm:p-10"
    >
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-slate-800 sm:text-2xl">회원가입</h2>
        <p className="text-slate-500">자녀·보호자 계정을 만들어 주세요.</p>
      </div>

      <div className="space-y-2">
        <label htmlFor="signup-email" className="block text-base font-semibold text-slate-700">
          이메일
        </label>
        <input
          id="signup-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-lg text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="signup-password" className="block text-base font-semibold text-slate-700">
          비밀번호
        </label>
        <input
          id="signup-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-lg text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
        <p className="text-sm text-slate-400">6자 이상으로 입력해 주세요.</p>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-4 text-lg font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
      >
        {isSubmitting ? "처리하는 중..." : "회원가입"}
      </button>

      {status !== "idle" && message ? (
        <div
          role={status === "success" ? "status" : "alert"}
          aria-live="polite"
          className={
            status === "success"
              ? "flex items-start gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-base font-medium text-emerald-700"
              : "flex items-start gap-2 rounded-xl bg-rose-50 px-4 py-3 text-base font-medium text-rose-700"
          }
        >
          {status === "success" ? (
            <CheckIcon className="mt-0.5 h-5 w-5 flex-shrink-0" />
          ) : (
            <AlertIcon className="mt-0.5 h-5 w-5 flex-shrink-0" />
          )}
          <span>{message}</span>
        </div>
      ) : null}
    </form>
  );
}

function CheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" {...props}>
      <path
        fillRule="evenodd"
        d="M16.704 5.29a1 1 0 010 1.415l-7.07 7.071a1 1 0 01-1.415 0L3.296 8.852a1 1 0 111.415-1.414l4.214 4.213 6.364-6.364a1 1 0 011.415.003z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function AlertIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" {...props}>
      <path
        fillRule="evenodd"
        d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.63-1.516 2.63H3.72c-1.347 0-2.189-1.463-1.516-2.63L8.485 2.495zM10 6a1 1 0 00-1 1v3a1 1 0 002 0V7a1 1 0 00-1-1zm0 7a1 1 0 100 2 1 1 0 000-2z"
        clipRule="evenodd"
      />
    </svg>
  );
}
