import Link from "next/link";
import type { ParentProfile } from "@/lib/supabase/parent-profiles-repo";

const NOTIFICATION_PREFERENCE_LABELS: Record<string, string> = {
  none: "아직 미사용",
  sms: "SMS",
  kakao: "카카오 알림톡",
};

export function ParentProfileList({
  profiles,
  loading,
  onSelect,
  selectedId,
}: {
  profiles: ParentProfile[];
  loading: boolean;
  onSelect: (profile: ParentProfile) => void;
  selectedId?: string;
}) {
  if (loading) {
    return (
      <div className="rounded-3xl bg-white p-8 text-center text-slate-400 shadow-sm ring-1 ring-slate-200">
        불러오는 중...
      </div>
    );
  }

  if (profiles.length === 0) {
    return (
      <div className="rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
        <p className="font-semibold text-slate-700">등록된 부모님/어르신이 없어요.</p>
        <p className="mt-1 text-sm text-slate-500">아래 양식으로 먼저 등록해 주세요.</p>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {profiles.map((profile, i) => (
        <li key={profile.id} className="animate-rag-fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
          {/* 전체 카드: onClick → 수정 모드 */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => onSelect(profile)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onSelect(profile); }}
            className={
              "relative w-full cursor-pointer rounded-2xl bg-white shadow-sm ring-1 transition-colors hover:ring-blue-300 flex flex-col items-center pb-3 pt-4 px-3 " +
              (selectedId === profile.id ? "ring-2 ring-blue-400" : "ring-slate-200")
            }
            style={{ minHeight: 140 }}
          >
            {/* 현황 링크 — 카드 안에 배치, 클릭 전파 차단 */}
            <Link
              href={`/dashboard/parents/${profile.id}`}
              onClick={(e) => e.stopPropagation()}
              className="absolute right-2.5 top-2.5 text-xs font-semibold text-slate-400 underline-offset-2 hover:text-blue-500 hover:underline"
            >
              현황
            </Link>

            <div
              className="flex shrink-0 items-center justify-center rounded-full text-lg font-bold mb-2.5"
              style={{ width: 52, height: 52, backgroundColor: "#EEF2FF", color: "#4F46E5" }}
            >
              {(profile.display_name ?? "?").charAt(0)}
            </div>
            <p className="text-sm font-bold text-slate-800 truncate w-full text-center">{profile.display_name}</p>
            {profile.relationship ? (
              <p className="mt-0.5 text-xs text-slate-500 truncate w-full text-center">{profile.relationship}</p>
            ) : null}
            <p className="mt-2 text-xs text-blue-500 font-semibold">수정</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
