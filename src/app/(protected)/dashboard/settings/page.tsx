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

        {/* 기관 관리자 전용: 주간 리포트 자동 발송 */}
        {orgId && (
          <section
            className="animate-rag-fade-in-up rounded-2xl bg-white px-5 py-5 shadow-sm ring-1 ring-slate-200"
            style={{ animationDelay: "240ms" }}
          >
            <h2 className="mb-1 text-sm font-bold uppercase tracking-widest text-slate-400">
              주간 리포트 자동 발송 <span className="ml-1 rounded bg-indigo-50 px-1.5 py-0.5 text-xs font-semibold text-indigo-600 normal-case">관리자</span>
            </h2>
            <p className="mb-4 text-xs text-slate-400">
              매주 월요일 08:00에 어르신 전체 요약을 이메일로 자동 발송합니다.
            </p>
            <ScheduleEditor
              orgId={orgId}
              initialEnabled={scheduleEnabled}
              initialEmails={scheduleEmails}
            />
          </section>
        )}

        {/* 기관 관리자 전용: 발송 이력 */}
        {orgId && (
          <section
            className="animate-rag-fade-in-up rounded-2xl bg-white px-5 py-5 shadow-sm ring-1 ring-slate-200"
            style={{ animationDelay: "300ms" }}
          >
            <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-slate-400">
              발송 이력 <span className="ml-1 rounded bg-indigo-50 px-1.5 py-0.5 text-xs font-semibold text-indigo-600 normal-case">관리자</span>
            </h2>
            <SendLogsSection orgId={orgId} />
          </section>
        )}

        {/* 기관 관리자 전용: 멤버 초대 */}
        {orgId && (
          <section
            className="animate-rag-fade-in-up rounded-2xl bg-white px-5 py-5 shadow-sm ring-1 ring-slate-200"
            style={{ animationDelay: "360ms" }}
          >
            <h2 className="mb-1 text-sm font-bold uppercase tracking-widest text-slate-400">
              멤버 초대 <span className="ml-1 rounded bg-indigo-50 px-1.5 py-0.5 text-xs font-semibold text-indigo-600 normal-case">관리자</span>
            </h2>
            <p className="mb-4 text-xs text-slate-400">
              초대 링크를 생성해 전달하면 상대방이 가입 후 자동으로 기관에 편입됩니다. (7일 유효)
            </p>
            <InviteMemberForm orgId={orgId} />
          </section>
        )}

        {/* 기관 관리자 전용: 개인정보 처리 설정 */}
        {orgId && (
          <section
            className="animate-rag-fade-in-up rounded-2xl bg-white px-5 py-5 shadow-sm ring-1 ring-slate-200"
            style={{ animationDelay: "420ms" }}
          >
            <h2 className="mb-1 text-sm font-bold uppercase tracking-widest text-slate-400">
              개인정보 처리 <span className="ml-1 rounded bg-indigo-50 px-1.5 py-0.5 text-xs font-semibold text-indigo-600 normal-case">관리자</span>
            </h2>
            <p className="mb-4 text-xs text-slate-400">
              녹음 파일은 AI 분석 후 자동 파기됩니다. 어르신 데이터 삭제는
              담당 복지사에게 문의하거나 아래 설정을 사용하세요.
            </p>
            <PrivacySettingsEditor orgId={orgId} initialRetentionDays={retentionDays} />
          </section>
        )}
      </div>
    </div>
  );
}
