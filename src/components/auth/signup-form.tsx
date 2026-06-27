"use client";

import { useMemo, useState, type FormEvent, type SVGProps } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { GoogleSignInButton } from "./google-signin-button";

type Status = "idle" | "submitting" | "success" | "duplicate" | "error";
type ResendStatus = "idle" | "sending" | "sent" | "error";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

type PasswordStrength = "weak" | "medium" | "strong";

// 외부 라이브러리(zxcvbn 등) 없이 간단한 휴리스틱만 쓴다 — MVP 단계에서는 "얼마나 강한 비밀번호인지
// 대략적인 감"만 주는 게 목적이고, 정밀한 추정은 과한 의존성이라 생략했다.
function getPasswordStrength(password: string): PasswordStrength | null {
  if (password.length === 0) return null;
  if (password.length < MIN_PASSWORD_LENGTH) return "weak";

  let variety = 0;
  if (/[a-z]/.test(password)) variety += 1;
  if (/[A-Z]/.test(password)) variety += 1;
  if (/[0-9]/.test(password)) variety += 1;
  if (/[^a-zA-Z0-9]/.test(password)) variety += 1;

  if (password.length >= 10 && variety >= 3) return "strong";
  if (password.length >= 8 && variety >= 2) return "medium";
  return "weak";
}

// AuthRetryableFetchError 등 일부 Supabase 에러는 message가 비어있거나 "{}"로 깨져서 온다(이메일
// 발송 인프라 쪽 문제일 때 직접 겪은 증상 — work-log 참고). 그런 경우 빈 메시지를 그대로 보여주지 않고
// 사람이 이해할 수 있는 문구로 바꾼다.
function describeAuthError(error: { message?: string }): string {
  const raw = error.message?.trim();
  if (!raw || raw === "{}" || raw === "[object Object]") {
    return "이메일 발송 중 문제가 생겼어요. 잠시 후 다시 시도하거나 관리자에게 문의해 주세요.";
  }
  return raw;
}

const STRENGTH_META: Record<PasswordStrength, { label: string; barClass: string; textClass: string }> = {
  weak: { label: "약함", barClass: "w-1/3 bg-rose-400", textClass: "text-rose-600" },
  medium: { label: "보통", barClass: "w-2/3 bg-amber-400", textClass: "text-amber-600" },
  strong: { label: "강함", barClass: "w-full bg-emerald-500", textClass: "text-emerald-600" },
};

export function SignupForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [touched, setTouched] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<ResendStatus>("idle");

  const isSubmitting = status === "submitting";

  const emailError = touched && email.length > 0 && !EMAIL_PATTERN.test(email) ? "이메일 형식이 올바르지 않아요." : null;
  const passwordError =
    touched && password.length > 0 && password.length < MIN_PASSWORD_LENGTH ? `${MIN_PASSWORD_LENGTH}자 이상으로 입력해 주세요.` : null;
  const confirmError =
    touched && confirmPassword.length > 0 && confirmPassword !== password ? "비밀번호가 일치하지 않아요." : null;

  const strength = useMemo(() => getPasswordStrength(password), [password]);

  const isFormValid =
    EMAIL_PATTERN.test(email) && password.length >= MIN_PASSWORD_LENGTH && confirmPassword === password;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched(true);
    if (!isFormValid) return;

    setStatus("submitting");
    setMessage(null);
    setResendStatus("idle");

    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      // "이메일 확인" 설정이 꺼져 있으면 중복 가입 시 이 에러 메시지가 그대로 온다(@supabase/auth-js
      // GoTrueClient.signUp 문서 주석 참고) — 켜져 있을 때는 아래 identities.length === 0 분기로 잡힌다.
      if (/already registered/i.test(error.message)) {
        setStatus("duplicate");
        setMessage("이미 가입된 이메일이에요. 로그인해 주세요.");
        return;
      }
      // 화면에는 사람이 읽을 수 있는 문구만 보여주지만(describeAuthError), 실제 원인 진단을 위해
      // 브라우저 콘솔에는 원본 에러(status/code/message)를 그대로 남긴다.
      console.error("[signup] signUp 실패:", error);
      setStatus("error");
      setMessage(describeAuthError(error));
      return;
    }

    // "이메일 확인"이 켜져 있는 프로젝트에서 이미 가입+확인된 이메일로 다시 가입하면, 이메일 추측 공격을
    // 막기 위해 에러 대신 가짜 user 객체를 돌려준다 — identities가 빈 배열인 게 그 신호다(공식 문서 패턴).
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setStatus("duplicate");
      setMessage("이미 가입된 이메일이에요. 로그인해 주세요.");
      return;
    }

    setStatus("success");
    setMessage("회원가입 요청을 받았어요. 이메일 확인 안내가 있다면 확인 후 로그인해 주세요.");
  }

  async function handleResend() {
    setResendStatus("sending");
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.resend({ type: "signup", email });
    setResendStatus(error ? "error" : "sent");
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

      <GoogleSignInButton />

      <div className="flex items-center gap-3 text-xs font-medium text-slate-400">
        <span className="h-px flex-1 bg-slate-200" />
        또는 이메일로 가입
        <span className="h-px flex-1 bg-slate-200" />
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
          autoFocus
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          onBlur={() => setTouched(true)}
          aria-invalid={emailError ? true : undefined}
          aria-describedby={emailError ? "signup-email-error" : undefined}
          className={`w-full rounded-xl border bg-white px-4 py-3 text-lg text-slate-800 shadow-sm focus:outline-none focus:ring-2 ${
            emailError ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200" : "border-slate-300 focus:border-blue-500 focus:ring-blue-200"
          }`}
        />
        {emailError ? (
          <p id="signup-email-error" className="text-sm text-rose-600">
            {emailError}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label htmlFor="signup-password" className="block text-base font-semibold text-slate-700">
          비밀번호
        </label>
        <div className="relative">
          <input
            id="signup-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onBlur={() => setTouched(true)}
            aria-invalid={passwordError ? true : undefined}
            aria-describedby={passwordError ? "signup-password-error" : undefined}
            className={`w-full rounded-xl border bg-white px-4 py-3 pr-12 text-lg text-slate-800 shadow-sm focus:outline-none focus:ring-2 ${
              passwordError ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200" : "border-slate-300 focus:border-blue-500 focus:ring-blue-200"
            }`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보이기"}
            className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 hover:text-slate-600"
          >
            {showPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
          </button>
        </div>
        {password.length > 0 ? (
          <div className="space-y-1">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              {strength ? <div className={`h-full rounded-full transition-all ${STRENGTH_META[strength].barClass}`} /> : null}
            </div>
            {strength ? <p className={`text-xs font-medium ${STRENGTH_META[strength].textClass}`}>비밀번호 강도: {STRENGTH_META[strength].label}</p> : null}
          </div>
        ) : null}
        {passwordError ? (
          <p id="signup-password-error" className="text-sm text-rose-600">
            {passwordError}
          </p>
        ) : (
          <p className="text-sm text-slate-400">{MIN_PASSWORD_LENGTH}자 이상으로 입력해 주세요.</p>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="signup-password-confirm" className="block text-base font-semibold text-slate-700">
          비밀번호 확인
        </label>
        <div className="relative">
          <input
            id="signup-password-confirm"
            name="password-confirm"
            type={showConfirmPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            onBlur={() => setTouched(true)}
            aria-invalid={confirmError ? true : undefined}
            aria-describedby={confirmError ? "signup-password-confirm-error" : undefined}
            className={`w-full rounded-xl border bg-white px-4 py-3 pr-12 text-lg text-slate-800 shadow-sm focus:outline-none focus:ring-2 ${
              confirmError ? "border-rose-400 focus:border-rose-500 focus:ring-rose-200" : "border-slate-300 focus:border-blue-500 focus:ring-blue-200"
            }`}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((prev) => !prev)}
            aria-label={showConfirmPassword ? "비밀번호 숨기기" : "비밀번호 보이기"}
            className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 hover:text-slate-600"
          >
            {showConfirmPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
          </button>
        </div>
        {confirmError ? (
          <p id="signup-password-confirm-error" className="text-sm text-rose-600">
            {confirmError}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={isSubmitting || (touched && !isFormValid)}
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
              : status === "duplicate"
                ? "flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-base font-medium text-amber-700"
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

      {status === "duplicate" ? (
        <Link
          href="/login"
          className="block w-full rounded-xl border border-blue-200 px-6 py-3 text-center text-base font-semibold text-blue-600 transition-colors hover:bg-blue-50"
        >
          로그인 페이지로 이동
        </Link>
      ) : null}

      {status === "success" ? (
        <div className="space-y-2">
          <a
            href="/login"
            className="block w-full rounded-xl border border-blue-200 px-6 py-3 text-center text-base font-semibold text-blue-600 transition-colors hover:bg-blue-50"
          >
            로그인 페이지로 이동
          </a>
          <button
            type="button"
            onClick={handleResend}
            disabled={resendStatus === "sending"}
            className="w-full text-center text-sm font-medium text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
          >
            {resendStatus === "sending"
              ? "재전송하는 중..."
              : resendStatus === "sent"
                ? "확인 메일을 다시 보냈어요"
                : resendStatus === "error"
                  ? "재전송에 실패했어요. 잠시 후 다시 시도해 주세요"
                  : "확인 메일을 못 받으셨나요? 다시 보내기"}
          </button>
        </div>
      ) : null}
    </form>
  );
}

function EyeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M10 3.5c-4.5 0-7.5 4.5-7.5 6.5s3 6.5 7.5 6.5 7.5-4.5 7.5-6.5-3-6.5-7.5-6.5zm0 10.5a4 4 0 110-8 4 4 0 010 8z" />
      <path d="M10 8a2 2 0 100 4 2 2 0 000-4z" />
    </svg>
  );
}

function EyeOffIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M3.28 2.22a.75.75 0 00-1.06 1.06l1.745 1.745C2.476 6.66 1.5 8.5 1.5 8.5s3 6.5 8.5 6.5c1.443 0 2.715-.392 3.81-.984l1.41 1.41a.75.75 0 101.06-1.061L3.28 2.22zM10 13.5a3.99 3.99 0 01-2.79-1.13l1.16-1.16a2 2 0 002.55-2.55l1.16-1.16A4 4 0 0110 13.5z" />
      <path d="M10 5c.86 0 1.68.13 2.44.36l-1.2 1.2A4 4 0 005.56 11.2l-2.1-2.1C4.5 7.45 6.84 5 10 5zM17.28 9.04A11.6 11.6 0 0015.06 6l-1.07 1.07c.9.78 1.66 1.75 2.2 2.5-.4.7-1.5 2.36-3.16 3.5l1.07 1.07c2.36-1.66 3.6-4.04 3.6-4.04s-.1-.18-.42-.06z" />
    </svg>
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
