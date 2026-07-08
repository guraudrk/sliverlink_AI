import type { Metadata } from "next";
import { getServerUser } from "@/lib/supabase/server-user";
import { RoleToggle } from "@/components/app/role-toggle";
import type { UserRole } from "@/app/api/user/role/route";

export const metadata: Metadata = { title: "설정 — SilverLink AI" };

export default async function SettingsPage() {
  const user = await getServerUser();
  const role: UserRole = (user?.user_metadata?.role as UserRole) ?? "family";

  return (
    <div className="flex flex-1 flex-col items-center bg-slate-50 px-4 py-10 sm:py-16">
      <div className="w-full max-w-md space-y-8">
        {/* 헤더 */}
        <div className="animate-rag-fade-in-up">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Settings</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">설정</h1>
        </div>

        {/* 계정 정보 */}
        <section className="animate-rag-fade-in-up rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-slate-200" style={{ animationDelay: "60ms" }}>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-slate-400">계정</h2>
          <p className="text-sm text-slate-600">{user?.email}</p>
        </section>

        {/* 역할 선택 */}
        <section className="animate-rag-fade-in-up" style={{ animationDelay: "120ms" }}>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-slate-400">
            나의 역할
          </h2>
          <p className="mb-4 text-sm text-slate-500 leading-relaxed">
            역할에 따라 대시보드의 강조 항목이 달라집니다. 기능은 동일하게 사용할 수 있어요.
          </p>
          <RoleToggle initialRole={role} />
        </section>
      </div>
    </div>
  );
}
