import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// 서버 컴포넌트/Route Handler에서만 사용한다. anon key만 사용하며, service role key는 절대 이 파일에 들어가지 않는다.
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component에서는 쿠키를 쓸 수 없다 — 세션 갱신은 미들웨어/Server Action 경로에서
            // 처리되므로, 여기서 발생하는 set 실패는 무시해도 안전하다.
          }
        },
      },
    }
  );
}
