import type { Metadata } from "next";
import { getServerUser } from "@/lib/supabase/server-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { RoleToggle } from "@/components/app/role-toggle";
import { PasteTemplateEditor } from "@/components/app/paste-template-editor";
import { DEFAULT_PASTE_TEMPLATE } from "@/app/api/org/paste-template/route";
import type { UserRole } from "@/app/api/user/role/route";

export const metadata: Metadata = { title: "설정 — SilverLink AI" };

export default async function SettingsPage() {
  const user = await getServerUser();
  const role: UserRole = (user?.user_metadata?.role as UserRole) ?? "family";

  // 기관 admin이면 템플릿 섹션 표시
  const supabase = await createSupabaseServerClient();
  let orgId: string | null = null;
  let pasteTemplate: string | null = null;
  if (user) {
    const [memberRes, tmplRes] = await Promise.all([
      supabase
        .from("org_members")
        .select("org_id, role")
        .eq("user_id", user.id)
        .maybeSingle(),
      Promise.resolve(null), // placeholder — tmpl fetch below
    ]);
    void tmplRes;

    if (memberRes.data?.role === "admin") {
      orgId = memberRes.data.org_id as string;
      const { data: tmpl } = await supabase
        .from("paste_templates")
        .select("template")
        .eq("org_id", orgId)
        .maybeSingle();
      pasteTemplate = tmpl?.template ?? DEFAULT_PASTE_TEMPLATE;
    }
  }

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

        {/* 기관 관리자 전용: 붙여넣기 형식 편집 */}
        {orgId && pasteTemplate !== null && (
          <section
            className="animate-rag-fade-in-up rounded-2xl bg-white px-5 py-5 shadow-sm ring-1 ring-slate-200"
            style={{ animationDelay: "180ms" }}
          >
            <h2 className="mb-1 text-sm font-bold uppercase tracking-widest text-slate-400">
              기록 복사 형식 <span className="ml-1 rounded bg-indigo-50 px-1.5 py-0.5 text-xs font-semibold text-indigo-600 normal-case">관리자</span>
            </h2>
            <p className="mb-4 text-xs text-slate-400">
              [기록 복사] 버튼을 눌렀을 때 클립보드에 복사되는 텍스트 형식입니다.
              변경 사항은 다음 리포트 생성부터 적용됩니다.
            </p>
            <PasteTemplateEditor orgId={orgId} initialTemplate={pasteTemplate} />
          </section>
        )}
      </div>
    </div>
  );
}
