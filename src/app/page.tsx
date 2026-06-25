import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Day4 시절엔 이 페이지가 공개 입력 폼이었지만, Day6+7부터 입력 폼이 로그인한 회원의
// parent_profiles를 선택하는 구조로 바뀌면서 비로그인 사용자가 쓸 수 없게 됐다.
// 그래서 "/"는 로그인 여부에 따라 적절한 곳으로 보내는 진입점 역할만 한다.
export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  redirect(data.user ? "/dashboard" : "/login");
}
