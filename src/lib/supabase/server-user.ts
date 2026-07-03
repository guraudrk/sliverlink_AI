import { cache } from "react";
import { createSupabaseServerClient } from "./server";

// React.cache()로 감싸면 같은 요청 안에서 getUser()를 여러 번 불러도 실제 Supabase 호출은 한 번만 한다.
// layout.tsx와 page.tsx가 각각 getUser()를 호출하던 이중 호출 문제를 해결한다.
export const getServerUser = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
});
