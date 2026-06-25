import { redirect } from "next/navigation";
import { DashboardNavBar } from "@/components/app/dashboard-nav-bar";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect("/login");
  }

  return (
    <>
      <DashboardNavBar />
      {children}
    </>
  );
}
