import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listSafetyAlerts } from "@/lib/supabase/safety-alerts-repo";
import { AlertList } from "@/components/alerts/alert-list";
import { PushPermissionButton } from "@/components/push/push-permission-button";

export default async function DashboardAlertsPage() {
  const supabase = await createSupabaseServerClient();
  const alerts = await listSafetyAlerts(supabase);

  return (
    <div className="flex flex-1 flex-col items-center bg-slate-50 px-4 py-10 sm:py-16">
      <div className="mx-auto mb-8 max-w-2xl w-full">
        <div className="animate-rag-fade-in-up">
          <Link
            href="/dashboard"
            className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-slate-400 hover:text-blue-500"
          >
            ← 대시보드
          </Link>
          <p className="text-sm font-semibold uppercase tracking-widest text-rose-500">SilverLink AI</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">안전 알림</h1>
          <p className="mt-2 text-slate-500">
            안부전화 분석 결과 감지된 안전 우려사항이에요.
          </p>
          <div className="mt-4">
            <PushPermissionButton />
          </div>
        </div>
      </div>

      <div
        className="mx-auto w-full max-w-2xl animate-rag-fade-in-up"
        style={{ animationDelay: "80ms" }}
      >
        <AlertList initialAlerts={alerts} />
      </div>
    </div>
  );
}
