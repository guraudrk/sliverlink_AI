import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const VALUE_PROPS = [
  {
    icon: "🎙️",
    title: "이미 하고 있는 전화가 돌봄이 됩니다",
    desc: "별도 장비 없이, 평소 부모님께 전화하는 그 순간에 앱으로 녹음만 하면 됩니다.",
  },
  {
    icon: "🤖",
    title: "AI가 7가지 건강 신호를 분석합니다",
    desc: "외로움, 인지 저하, 낙상 위험, 수면 문제 등 전문가가 주목하는 신호를 자동으로 감지해요.",
  },
  {
    icon: "🔔",
    title: "이상 신호는 즉시 알림으로 도착합니다",
    desc: "위험 수준 신호가 감지되면 안전 알림이 바로 올라옵니다. 멀리 살아도 놓치지 않아요.",
  },
] as const;

const COMPARISON = [
  { feature: "어르신 건강 특화 분석",    sl: true,  clova: false, google: false },
  { feature: "7가지 건강 신호 감지",      sl: true,  clova: false, google: false },
  { feature: "위험 신호 안전 알림",       sl: true,  clova: false, google: false },
  { feature: "가족 케어 대시보드",        sl: true,  clova: false, google: false },
  { feature: "통화 이력 타임라인",        sl: true,  clova: false, google: false },
  { feature: "AI 케어 비서",             sl: true,  clova: false, google: false },
] as const;

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) redirect("/dashboard");

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-slate-950">
      {/* ── Nav ── */}
      <nav className="flex items-center justify-between px-6 py-4 sm:px-8">
        <p className="text-sm font-bold tracking-widest text-blue-600 uppercase">SilverLink AI</p>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
          >
            로그인
          </Link>
          <Link
            href="/signup"
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            무료 시작
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center sm:py-24">
        <span className="mb-4 inline-block rounded-full bg-blue-50 px-4 py-1.5 text-xs font-semibold text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
          AI 통화 건강 분석 서비스
        </span>
        <h1 className="max-w-lg text-4xl font-extrabold leading-tight text-slate-900 dark:text-white sm:text-5xl">
          부모님과의 통화,<br />
          <span className="text-blue-600">AI가 건강을 지킵니다</span>
        </h1>
        <p className="mt-5 max-w-md text-lg text-slate-500 dark:text-slate-400 leading-relaxed">
          평소 하던 전화를 앱으로 녹음하면 AI가 건강 신호를 분석하고,
          이상 징후가 감지되면 즉시 알려드려요.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/signup"
            className="w-full rounded-2xl bg-blue-600 px-8 py-3.5 text-base font-bold text-white shadow-lg shadow-blue-500/25 hover:bg-blue-700 transition-all hover:-translate-y-0.5 sm:w-auto"
          >
            무료로 시작하기 →
          </Link>
          <Link
            href="/login"
            className="w-full rounded-2xl border border-slate-200 px-8 py-3.5 text-base font-semibold text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-all dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 sm:w-auto"
          >
            로그인
          </Link>
        </div>
      </section>

      {/* ── Value Props ── */}
      <section className="bg-slate-50 dark:bg-slate-900 px-6 py-14 sm:px-8">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-8 text-center text-2xl font-bold text-slate-800 dark:text-slate-100">
            왜 SilverLink인가요?
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {VALUE_PROPS.map((v) => (
              <div
                key={v.title}
                className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm ring-1 ring-slate-100 dark:ring-slate-700"
              >
                <p className="text-3xl">{v.icon}</p>
                <h3 className="mt-3 text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug">
                  {v.title}
                </h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  {v.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 경쟁사 비교 ── */}
      <section className="px-6 py-14 sm:px-8">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-2 text-center text-2xl font-bold text-slate-800 dark:text-slate-100">
            다른 녹음 앱과 다릅니다
          </h2>
          <p className="mb-8 text-center text-sm text-slate-500">
            클로바 노트, Google Recorder는 회의·메모용입니다. SilverLink는 처음부터 어르신 돌봄을 위해 만들었습니다.
          </p>
          <div className="overflow-x-auto rounded-2xl ring-1 ring-slate-200 dark:ring-slate-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
                  <th className="px-4 py-3 text-left font-semibold text-slate-500 dark:text-slate-400">기능</th>
                  <th className="px-4 py-3 text-center font-bold text-blue-600">SilverLink</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-400">클로바 노트</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-400">Google Recorder</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, i) => (
                  <tr
                    key={row.feature}
                    className={i % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50/50 dark:bg-slate-800/50"}
                  >
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{row.feature}</td>
                    <td className="px-4 py-3 text-center text-base">{row.sl ? "✅" : "❌"}</td>
                    <td className="px-4 py-3 text-center text-base">{row.clova ? "✅" : "❌"}</td>
                    <td className="px-4 py-3 text-center text-base">{row.google ? "✅" : "❌"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="bg-gradient-to-br from-blue-600 to-indigo-700 px-6 py-14 text-center sm:px-8">
        <h2 className="text-2xl font-bold text-white sm:text-3xl">
          오늘부터 부모님 돌봄을 시작하세요
        </h2>
        <p className="mt-3 text-blue-200">무료로 사용할 수 있습니다.</p>
        <Link
          href="/signup"
          className="mt-6 inline-block rounded-2xl bg-white px-8 py-3.5 text-base font-bold text-blue-700 shadow-lg hover:bg-blue-50 transition-all hover:-translate-y-0.5"
        >
          무료로 시작하기 →
        </Link>
      </section>

      {/* ── Footer ── */}
      <footer className="px-6 py-6 text-center text-xs text-slate-400 dark:text-slate-600">
        © 2026 SilverLink AI — 어르신 건강 특화 AI 통화 분석
      </footer>
    </div>
  );
}
