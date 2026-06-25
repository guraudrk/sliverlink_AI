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
    <ul className="space-y-3">
      {profiles.map((profile) => (
        <li key={profile.id}>
          <button
            type="button"
            onClick={() => onSelect(profile)}
            className={
              "w-full rounded-2xl bg-white p-5 text-left shadow-sm ring-1 transition-colors hover:ring-blue-300 " +
              (selectedId === profile.id ? "ring-2 ring-blue-400" : "ring-slate-200")
            }
          >
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-lg font-bold text-slate-800">{profile.display_name}</p>
              <span className="flex items-center gap-2">
                {profile.relationship ? (
                  <span className="text-sm text-slate-500">{profile.relationship}</span>
                ) : null}
                <span className="text-xs font-semibold text-blue-500">수정</span>
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-400">
              알림 채널: {NOTIFICATION_PREFERENCE_LABELS[profile.notification_preference ?? "none"]}
            </p>
            {profile.care_context ? (
              <p className="mt-2 text-sm text-slate-600">{profile.care_context}</p>
            ) : null}
          </button>
        </li>
      ))}
    </ul>
  );
}
