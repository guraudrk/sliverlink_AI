import { ZodError } from "zod";
import { ragReindexRequestSchema } from "@/lib/silverlink/rag/schema";
import { indexRagDocuments } from "@/lib/silverlink/rag/indexer";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

// 배치 임베딩 적재용 엔드포인트(Day14 가이드 Step4) — body에 { } 만 보내면 로그인 사용자의
// 전체 부모님 데이터를, parentId를 보내면 그 부모님만 다시 임베딩한다.
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
    input = ragReindexRequestSchema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonResponse({ ok: false, error: "validation_failed", issues: error.issues }, 400);
    }
    throw error;
  }

  try {
    const result = await indexRagDocuments(supabase, userData.user.id, input);
    if (!result.ok) {
      return jsonResponse({ ok: false, error: result.error }, 404);
    }
    return jsonResponse({ ok: true, indexed: result.indexed });
  } catch {
    return jsonResponse({ ok: false, error: "reindex_failed" }, 500);
  }
}
