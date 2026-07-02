import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-slate-50 px-4 py-10 sm:py-16">
      <div className="mb-8 max-w-sm text-center animate-rag-fade-in-up">
        <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">SilverLink AI</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">다시 만나서 반가워요</h1>
        <p className="mt-2 text-slate-500">로그인하고 부모님 돌봄을 이어가요.</p>
      </div>

      <div className="w-full max-w-sm animate-rag-fade-in-up" style={{ animationDelay: "80ms" }}>
        {error === "oauth_failed" ? (
          <div role="alert" className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            Google 로그인에 실패했어요. 다시 시도해 주세요.
          </div>
        ) : null}
        <LoginForm />
        <p className="mt-6 text-center text-sm text-slate-500">
          계정이 없으신가요?{" "}
          <Link href="/signup" className="font-semibold text-blue-600 hover:text-blue-700">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}
