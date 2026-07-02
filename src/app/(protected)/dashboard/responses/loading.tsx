export default function Loading() {
  return (
    <div className="flex flex-1 flex-col items-center bg-slate-50 px-4 py-10 sm:py-16">
      <div className="w-full max-w-2xl">
        <div className="mb-8 space-y-2 text-center">
          <div className="mx-auto h-3 w-20 animate-pulse rounded-full bg-slate-200" />
          <div className="mx-auto h-8 w-44 animate-pulse rounded-xl bg-slate-200" />
          <div className="mx-auto h-4 w-52 animate-pulse rounded-lg bg-slate-200" />
        </div>
        <div className="mb-5 h-12 w-full animate-pulse rounded-xl bg-slate-200" />
        <ul className="space-y-3">
          {[1, 2, 3].map((i) => (
            <li key={i} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <div className="space-y-2">
                <div className="h-5 w-24 animate-pulse rounded-lg bg-slate-200" />
                <div className="h-4 w-full animate-pulse rounded-lg bg-slate-200" />
                <div className="h-3 w-20 animate-pulse rounded-lg bg-slate-200" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
