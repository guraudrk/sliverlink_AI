import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Google OAuth(또는 다른 OAuth provider) 로그인이 끝나면 Supabase가 이 경로로 ?code=... 를 붙여
// 리다이렉트한다(signInWithOAuth의 redirectTo로 지정한 주소). PKCE 코드를 세션으로 교환해야 비로소
// 쿠키에 로그인 세션이 저장되므로, 이 교환은 반드시 서버에서 해야 한다(클라이언트 컴포넌트가 아니라
// Route Handler인 이유).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}/dashboard`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
}
