import { ZodError } from "zod";
import { DEFAULT_RAG_TIME_WINDOW_DAYS, ragEvidenceRequestSchema } from "@/lib/silverlink/rag/schema";
import { classifyQuery } from "@/lib/silverlink/rag/query-classifier";
import { buildEvidence } from "@/lib/silverlink/rag/evidence-builder";
import { fetchRagEvidenceSourceRows } from "@/lib/supabase/rag-evidence-repo";
import { isOwnParentProfile } from "@/lib/supabase/care-tasks-repo";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
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
    input = ragEvidenceRequestSchema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonResponse({ ok: false, error: "validation_failed", issues: error.issues }, 400);
    }
    throw error;
  }

  if (input.parentId) {
    let owns = false;
    try {
      owns = await isOwnParentProfile(supabase, input.parentId);
    } catch {
      return jsonResponse({ ok: false, error: "ownership_check_failed" }, 500);
    }
    if (!owns) {
      return jsonResponse({ ok: false, error: "parent_not_found" }, 404);
    }
  }

  const category = classifyQuery(input.query);
  const timeWindowDays = input.timeWindowDays ?? DEFAULT_RAG_TIME_WINDOW_DAYS;

  try {
    const rows = await fetchRagEvidenceSourceRows(supabase, { parentId: input.parentId, timeWindowDays });
    const evidence = buildEvidence(category, rows);
    return jsonResponse({ ok: true, category, evidence });
  } catch {
    return jsonResponse({ ok: false, error: "evidence_fetch_failed" }, 500);
  }
}
