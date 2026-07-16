import { Suspense } from "react";
import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listParentProfiles } from "@/lib/supabase/parent-profiles-repo";
import { CareJourneyClient } from "@/components/timeline/care-journey-client";

export default async function DashboardTimelinePage() {
  const supabase = await createSupabaseServerClient();
  const parents = await listParentProfiles(supabase);

  return (
    <div className="flex flex-1 flex-col items-center px-4 py-10 sm:py-16" style={{ backgroundColor: "var(--sl-bg)" }}>
      <div className="mx-auto w-full max-w-2xl">
        {/* 헤더 */}
        <div className="mb-6 flex items-center gap-4 animate-rag-fade-in-up">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
            style={{ background: "linear-gradient(135deg,#12183F,#1B2660)" }}
          >
            <CalendarDays size={24} color="#8FA6FF" strokeWidth={1.8} />
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-widest" style={{ color: "#2E5BFF" }}>SilverLink AI</p>
            <h1 className="mt-0.5 text-2xl font-bold sm:text-3xl" style={{ color: "var(--sl-ink)" }}>케어 여정 타임라인</h1>
          </div>
        </div>
        <p className="mb-8 text-sm leading-relaxed animate-rag-fade-in-up" style={{ color: "#667085" }}>
          안부전화, 안전 알림, 가족 브리핑을 한 화면에서 시간순으로 확인하고, 주간 트렌드 차트로 변화를 파악해요.
        </p>

        {parents.length === 0 ? (
          <div className="rounded-2xl px-8 py-12 text-center" style={{ backgroundColor: "var(--sl-card)", border: "1px solid var(--sl-border)" }}>
            <p style={{ color: "#667085" }}>등록된 부모님이 없어요.</p>
            <Link
              href="/parents"
              className="mt-4 inline-block rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
              style={{ backgroundColor: "#2E5BFF" }}
            >
              부모님 등록하기
            </Link>
          </div>
        ) : (
          <Suspense fallback={
            <div className="flex h-40 items-center justify-center">
              <p className="text-sm" style={{ color: "#98A2B3" }}>불러오는 중…</p>
            </div>
          }>
            <CareJourneyClient parents={parents} />
          </Suspense>
        )}
      </div>
    </div>
  );
}
