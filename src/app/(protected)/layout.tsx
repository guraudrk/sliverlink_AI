import { redirect } from "next/navigation";
import { DashboardNavBar } from "@/components/app/dashboard-nav-bar";
import { MobileBottomNav } from "@/components/app/mobile-bottom-nav";
import { NavigationProgress } from "@/components/app/navigation-progress";
import { getServerUser } from "@/lib/supabase/server-user";
import type { UserRole } from "@/app/api/user/role/route";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await getServerUser();

  if (!user) {
    redirect("/login");
  }

  const role: UserRole = (user.user_metadata?.role as UserRole) ?? "family";

  return (
    <>
      <NavigationProgress />
      <DashboardNavBar role={role} />
      <div className="pb-16 sm:pb-0">{children}</div>
      <MobileBottomNav />
    </>
  );
}
