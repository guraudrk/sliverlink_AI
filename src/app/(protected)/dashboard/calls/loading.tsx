export default function Loading() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-slate-50 px-4 py-16">
      <div className="w-full max-w-2xl space-y-4 text-center">
        <div className="mx-auto h-3 w-20 animate-pulse rounded-full bg-slate-200" />
        <div className="mx-auto h-9 w-48 animate-pulse rounded-xl bg-slate-200" />
        <div className="mx-auto h-4 w-64 animate-pulse rounded-lg bg-slate-200" />
      </div>
    </div>
  );
}
