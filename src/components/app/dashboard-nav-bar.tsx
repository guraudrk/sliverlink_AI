import Link from "next/link";

export function DashboardNavBar() {
  return (
    <div className="w-full border-b border-slate-200 bg-white px-4 py-3">
      <div className="mx-auto flex max-w-xl items-center">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition-colors hover:text-blue-600"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          대시보드로
        </Link>
      </div>
    </div>
  );
}

function ArrowLeftIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" {...props}>
      <path
        fillRule="evenodd"
        d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z"
        clipRule="evenodd"
      />
    </svg>
  );
}
