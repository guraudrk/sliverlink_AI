export default function Loading() {
  return (
    <div className="flex flex-1 flex-col items-center bg-slate-50 px-4 py-10 sm:py-16">
      <div className="w-full max-w-2xl">
        <div className="mb-6 space-y-2 text-center">
          <div className="mx-auto h-3 w-16 animate-pulse rounded-full bg-slate-200" />
          <div className="mx-auto h-8 w-40 animate-pulse rounded-xl bg-slate-200" />
        </div>
        <ul className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <li key={i} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <div className="h-5 w-14 animate-pulse rounded-full bg-slate-200" />
                    <div className="h-5 w-10 animate-pulse rounded-full bg-slate-200" />
                  </div>
                  <div className="h-4 w-32 animate-pulse rounded-lg bg-slate-200" />
                  <div className="h-3 w-24 animate-pulse rounded-lg bg-slate-200" />
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
