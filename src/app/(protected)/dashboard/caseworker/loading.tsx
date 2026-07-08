export default function Loading() {
  return (
    <div className="flex flex-1 flex-col items-center bg-slate-50 px-4 py-10 sm:py-16">
      <div className="mx-auto w-full max-w-2xl">
        {/* 헤더 스켈레톤 */}
        <div className="mb-8 flex items-center gap-5 animate-skeleton-in">
          <div className="h-16 w-16 animate-pulse rounded-2xl bg-slate-200" />
          <div className="space-y-2">
            <div className="h-3 w-20 animate-pulse rounded-full bg-slate-200" />
            <div className="h-7 w-32 animate-pulse rounded-xl bg-slate-200" />
          </div>
        </div>

        {/* KPI 스켈레톤 */}
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4 animate-skeleton-in">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="h-3 w-16 animate-pulse rounded-full bg-slate-200" />
              <div className="mt-2 h-7 w-12 animate-pulse rounded-lg bg-slate-200" />
            </div>
          ))}
        </div>

        {/* 검색 바 스켈레톤 */}
        <div className="mb-5 h-10 w-full animate-pulse rounded-xl bg-slate-200 animate-skeleton-in" />

        {/* 카드 스켈레톤 */}
        <ul className="space-y-2.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <li
              key={i}
              className="rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-slate-200 animate-skeleton-in"
              style={{ animationDelay: `${120 + i * 50}ms` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <div className="h-5 w-24 animate-pulse rounded-full bg-slate-200" />
                    <div className="h-5 w-14 animate-pulse rounded-full bg-slate-200" />
                  </div>
                  <div className="h-3 w-32 animate-pulse rounded-lg bg-slate-200" />
                </div>
                <div className="h-4 w-4 animate-pulse rounded bg-slate-200" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
