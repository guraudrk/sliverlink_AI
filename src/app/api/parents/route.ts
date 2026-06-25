import { ZodError } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  createParentProfile,
  listParentProfiles,
  parentProfileInputSchema,
} from "@/lib/supabase/parent-profiles-repo";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return jsonResponse({ ok: false, error: "unauthorized" }, 401);
  }

  try {
    const profiles = await listParentProfiles(supabase);
    return jsonResponse({ ok: true, profiles });
  } catch {
    return jsonResponse({ ok: false, error: "list_failed" }, 500);
  }
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return jsonResponse({ ok: false, error: "unauthorized" }, 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "invalid_json" }, 400);
  }

  let input;
  try {
    input = parentProfileInputSchema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonResponse({ ok: false, error: "validation_failed", issues: error.issues }, 400);
    }
    throw error;
  }

  try {
    const profile = await createParentProfile(supabase, userData.user.id, input);
    return jsonResponse({ ok: true, profile });
  } catch {
    return jsonResponse({ ok: false, error: "create_failed" }, 500);
  }
}
