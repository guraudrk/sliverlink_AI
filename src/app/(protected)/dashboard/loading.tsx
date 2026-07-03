export default function DashboardLoading() {
  return (
    <div className="flex flex-1 flex-col items-center bg-slate-50 px-4 py-10 sm:py-16">
      <div className="w-full max-w-xl space-y-6">
        {/* 환영 카드 스켈레톤 */}
        <div className="flex items-center justify-between gap-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8 animate-skeleton-in">
          <div className="space-y-2 flex-1">
            <div className="h-3 w-24 animate-pulse rounded-full bg-slate-200" />
            <div className="h-7 w-32 animate-pulse rounded-xl bg-slate-200" />
            <div className="h-4 w-48 animate-pulse rounded-lg bg-slate-200" />
          </div>
          <div className="h-10 w-20 animate-pulse rounded-xl bg-slate-200" />
        </div>

        {/* AI 어시스턴트 카드 스켈레톤 */}
        <div className="flex items-center justify-between gap-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8 animate-skeleton-in" style={{ animationDelay: "60ms" }}>
          <div className="space-y-2 flex-1">
            <div className="h-3 w-20 animate-pulse rounded-full bg-slate-200" />
            <div className="h-7 w-40 animate-pulse rounded-xl bg-slate-200" />
            <div className="h-4 w-56 animate-pulse rounded-lg bg-slate-200" />
          </div>
          <div className="h-16 w-16 shrink-0 animate-pulse rounded-2xl bg-slate-200" />
        </div>

        {/* 메뉴 그리드 스켈레톤 */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div
              key={i}
              className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 animate-skeleton-in"
              style={{ animationDelay: `${120 + i * 40}ms` }}
            >
              <div className="space-y-2">
                <div className="h-4 w-24 animate-pulse rounded-lg bg-slate-200 mx-auto" />
                <div className="h-3 w-16 animate-pulse rounded-md bg-slate-200 mx-auto" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
