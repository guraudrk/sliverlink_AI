import { createBrowserClient } from "@supabase/ssr";

// 클라이언트 컴포넌트에서만 사용한다. anon key만 사용하며, service role key는 절대 이 파일에 들어가지 않는다.
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
