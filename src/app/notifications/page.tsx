import { DashboardNavBar } from "@/components/app/dashboard-nav-bar";
import { NotificationPreviewPanel } from "@/components/notification-preview-panel";

export default function NotificationsPage() {
  return (
    <>
      <DashboardNavBar />
      <div className="flex flex-1 flex-col items-center bg-slate-50 px-4 py-10 sm:py-16">
        <div className="mb-8 max-w-xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">
            SilverLink AI
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
            알림 준비 미리보기
          </h1>
          <p className="mt-2 text-slate-500">
            지금 알림을 보내야 할 케어 업무와 발송될 메시지를 미리 확인해요.
          </p>
        </div>
        <NotificationPreviewPanel />
      </div>
    </>
  );
}
