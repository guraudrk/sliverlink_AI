import type { Metadata } from "next";
import { getServerUser } from "@/lib/supabase/server-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { RoleToggle } from "@/components/app/role-toggle";
import { PasteTemplateEditor } from "@/components/app/paste-template-editor";
import { ScheduleEditor } from "@/components/app/schedule-editor";
import { SendLogsSection } from "@/components/app/send-logs-section";
import { PrivacySettingsEditor } from "@/components/app/privacy-settings-editor";
import { InviteMemberForm } from "@/components/app/invite-member-form";
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
  let scheduleEnabled   = false;
  let scheduleEmails:   string[] = [];
  let retentionDays:    number | null = null;
  if (user) {
    const { data: memberData } = await supabase
      .from("org_members")
      .select("org_id, role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (memberData?.role === "admin") {
      orgId = memberData.org_id as string;
      const [tmplRes, schedRes, orgRes] = await Promise.all([
        supabase.from("paste_templates").select("template").eq("org_id", orgId).maybeSingle(),
        supabase.from("report_schedules").select("enabled, recipient_emails").eq("org_id", orgId).maybeSingle(),
        supabase.from("organizations").select("recording_retention_days").eq("id", orgId).maybeSingle(),
      ]);
      pasteTemplate     = tmplRes.data?.template ?? DEFAULT_PASTE_TEMPLATE;
      scheduleEnabled   = schedRes.data?.enabled ?? false;
      scheduleEmails    = (schedRes.data?.recipient_emails as string[]) ?? [];
      retentionDays     = orgRes.data?.recording_retention_days ?? null;
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center bg-slate-50 px-4 py-10 sm:py-16">
      <div className="w-full max-w-3xl space-y-6">
        {/* 헤더 */}
        <div className="animate-rag-fade-in-up">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Settings</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">설정</h1>
        </div>

        {/* 계정 + 역할 — 가로 2열 */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* 계정 정보 */}
          <section className="animate-rag-fade-in-up rounded-2xl bg-white px-6 py-5 shadow-sm ring-1 ring-slate-200" style={{ animationDelay: "60ms" }}>
            <h2 className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-400">계정</h2>
            <p className="mt-3 text-sm font-medium text-slate-700">{user?.email}</p>
            <p className="mt-0.5 text-xs text-slate-400">가입된 이메일 주소</p>
          </section>

          {/* 역할 선택 */}
          <section className="animate-rag-fade-in-up rounded-2xl bg-white px-6 py-5 shadow-sm ring-1 ring-slate-200" style={{ animationDelay: "120ms" }}>
            <h2 className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-400">나의 역할</h2>
            <p className="mb-4 text-xs text-slate-500 leading-relaxed mt-1">
              역할에 따라 대시보드 강조 항목이 달라집니다.
            </p>
            <RoleToggle initialRole={role} />
          </section>
        </div>

        {/* 기관 관리자 전용 섹션 */}
        {orgId && (
          <>
            <div className="animate-rag-fade-in-up" style={{ animationDelay: "180ms" }}>
              <p className="text-xs font-bold uppercase tracking-widest text-indigo-400">기관 관리자</p>
              <div className="mt-2 h-px bg-slate-200" />
            </div>

            {/* 기록 복사 형식 + 주간 리포트 — 2열 */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2" style={{ animationDelay: "210ms" }}>
              {pasteTemplate !== null && (
                <section className="animate-rag-fade-in-up rounded-2xl bg-white px-6 py-6 shadow-sm ring-1 ring-slate-200">
                  <h2 className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-400">
                    기록 복사 형식
                  </h2>
                  <p className="mb-4 text-xs text-slate-400 mt-1">
                    [기록 복사] 버튼 클릭 시 복사되는 형식입니다.
                  </p>
                  <PasteTemplateEditor orgId={orgId} initialTemplate={pasteTemplate} />
                </section>
              )}

              <section className="animate-rag-fade-in-up rounded-2xl bg-white px-6 py-6 shadow-sm ring-1 ring-slate-200">
                <h2 className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-400">
                  주간 리포트 자동 발송
                </h2>
                <p className="mb-4 text-xs text-slate-400 mt-1">
                  매주 월요일 08:00 어르신 전체 요약 이메일 발송.
                </p>
                <ScheduleEditor
                  orgId={orgId}
                  initialEnabled={scheduleEnabled}
                  initialEmails={scheduleEmails}
                />
              </section>
            </div>

            {/* 발송 이력 — 전체 너비 */}
            <section
              className="animate-rag-fade-in-up rounded-2xl bg-white px-6 py-6 shadow-sm ring-1 ring-slate-200"
              style={{ animationDelay: "270ms" }}
            >
              <h2 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">
                발송 이력
              </h2>
              <SendLogsSection orgId={orgId} />
            </section>

            {/* 멤버 초대 + 개인정보 처리 — 2열 */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2" style={{ animationDelay: "330ms" }}>
              <section className="animate-rag-fade-in-up rounded-2xl bg-white px-6 py-6 shadow-sm ring-1 ring-slate-200">
                <h2 className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-400">
                  멤버 초대
                </h2>
                <p className="mb-4 text-xs text-slate-400 mt-1">
                  초대 링크를 전달하면 가입 후 자동으로 기관에 편입됩니다. (7일 유효)
                </p>
                <InviteMemberForm orgId={orgId} />
              </section>

              <section className="animate-rag-fade-in-up rounded-2xl bg-white px-6 py-6 shadow-sm ring-1 ring-slate-200">
                <h2 className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-400">
                  개인정보 처리
                </h2>
                <p className="mb-4 text-xs text-slate-400 mt-1">
                  녹음 파일은 AI 분석 후 자동 파기됩니다.
                </p>
                <PrivacySettingsEditor orgId={orgId} initialRetentionDays={retentionDays} />
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
