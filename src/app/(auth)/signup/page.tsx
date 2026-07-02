import Link from "next/link";
import { SignupForm } from "@/components/auth/signup-form";

export default function SignupPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-slate-50 px-4 py-10 sm:py-16">
      <div className="mb-8 max-w-sm text-center animate-rag-fade-in-up">
        <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">SilverLink AI</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">시작해 볼까요</h1>
        <p className="mt-2 text-slate-500">자녀·보호자 계정을 만들고 부모님을 등록해 보세요.</p>
      </div>

      <div className="w-full max-w-sm animate-rag-fade-in-up" style={{ animationDelay: "80ms" }}>
        <SignupForm />
        <p className="mt-6 text-center text-sm text-slate-500">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
