import { redirect } from "next/navigation";
import { DashboardNavBar } from "@/components/app/dashboard-nav-bar";
import { MobileBottomNav } from "@/components/app/mobile-bottom-nav";
import { NavigationProgress } from "@/components/app/navigation-progress";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect("/login");
  }

  return (
    <>
      <NavigationProgress />
      <DashboardNavBar />
      <div className="pb-16 sm:pb-0">{children}</div>
      <MobileBottomNav />
    </>
  );
}
