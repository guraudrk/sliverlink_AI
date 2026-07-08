import { createSupabaseServerClient } from "@/lib/supabase/server";

export type UserRole = "family" | "caseworker";

function errResponse(msg: string, status = 400) {
  return new Response(JSON.stringify({ ok: false, error: msg }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return errResponse("unauthorized", 401);

  let role: UserRole;
  try {
    const body = await request.json();
    if (body.role !== "family" && body.role !== "caseworker") {
      return errResponse("invalid_role");
    }
    role = body.role;
  } catch {
    return errResponse("invalid_json");
  }

  const { error } = await supabase.auth.updateUser({ data: { role } });
  if (error) return errResponse(error.message, 500);

  // updateUser는 Supabase DB를 업데이트하지만 JWT 세션 쿠키는 갱신하지 않는다.
  // refreshSession()을 호출해야 새 user_metadata가 쿠키에 반영되어
  // 다음 Server Component 렌더링(layout.tsx)에서 올바른 role을 읽을 수 있다.
  await supabase.auth.refreshSession();

  return new Response(JSON.stringify({ ok: true, role }), {
    headers: { "Content-Type": "application/json" },
  });
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return errResponse("unauthorized", 401);

  const role: UserRole = (userData.user.user_metadata?.role as UserRole) ?? "family";
  return new Response(JSON.stringify({ ok: true, role }), {
    headers: { "Content-Type": "application/json" },
  });
}
