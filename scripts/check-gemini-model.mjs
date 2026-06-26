// 사용법: node --env-file=.env.local scripts/check-gemini-model.mjs (또는 npm run check:gemini)
// 브라우저 로그인 없이 현재 GEMINI_LLM_MODEL이 안정적인지(속도, 503/429 여부)와 function calling이
// 정확한지(명확한 명령 -> 호출, 모호한 명령 -> 되묻기)를 빠르게 점검한다.
import { GoogleGenAI, ApiError } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("GEMINI_API_KEY가 설정되어 있지 않습니다. .env.local을 확인하세요.");
  process.exit(1);
}

const model = process.env.GEMINI_LLM_MODEL ?? "gemini-2.5-flash";
const client = new GoogleGenAI({ apiKey });

const REQUEST_CARE_CALL_TOOL = {
  name: "request_care_call",
  description: "특정 일정에 대해 어르신께 안부전화를 건다. 명확하게 전화를 요청했을 때만 호출한다.",
  parametersJsonSchema: {
    type: "object",
    properties: { care_task_id: { type: "string", description: "대상 일정의 id" } },
    required: ["care_task_id"],
  },
};

let failures = 0;

async function call(label, params) {
  const start = Date.now();
  try {
    const response = await client.models.generateContent(params);
    const ms = Date.now() - start;
    const functionCall = response.candidates?.[0]?.content?.parts?.find((p) => p.functionCall)?.functionCall;
    console.log(`[${label}] OK ${ms}ms`, functionCall ? `FUNCTION_CALL: ${JSON.stringify(functionCall)}` : `TEXT: ${response.text}`);
    return { ms, text: response.text, functionCall };
  } catch (error) {
    const ms = Date.now() - start;
    const status = error instanceof ApiError ? error.status : "?";
    console.log(`[${label}] ERROR ${ms}ms status=${status}`, error.message ?? error);
    failures++;
    return null;
  }
}

console.log(`점검 모델: ${model}\n`);

for (let i = 1; i <= 3; i++) {
  await call(`기본 응답 ${i}`, {
    model,
    contents: `안녕하세요, 테스트입니다 (${i})`,
    config: { thinkingConfig: { thinkingBudget: 0 }, maxOutputTokens: 200 },
  });
}

const explicit = await call("명확한 명령 -> function calling 기대", {
  model,
  contents:
    "현재 미완료 일정 목록(명령 대상 후보):\n- id=task-123, 내용: 오늘 낮잠 잘 잤는지 확인, 상태: scheduled\n\n자녀의 메시지: task-123 일정으로 전화 걸어줘",
  config: {
    systemInstruction: "전화 걸어줘 같은 명확한 명령일 때만 도구를 호출하세요. care_task_id는 제공된 목록의 값을 그대로 써야 합니다.",
    thinkingConfig: { thinkingBudget: 0 },
    maxOutputTokens: 500,
    tools: [{ functionDeclarations: [REQUEST_CARE_CALL_TOOL] }],
  },
});
if (!explicit?.functionCall) {
  console.log("  ⚠ 명확한 명령인데 function call이 안 나왔습니다 — 프롬프트/모델 점검 필요");
  failures++;
}

const ambiguous = await call("모호한 명령 -> 되묻기 기대", {
  model,
  contents:
    "현재 미완료 일정 목록(명령 대상 후보):\n- id=task-123, 내용: 오늘 낮잠 잘 잤는지 확인, 상태: scheduled\n- id=task-456, 내용: 오늘 복약 확인, 상태: scheduled\n\n자녀의 메시지: 전화 걸어줘",
  config: {
    systemInstruction: "어떤 일정인지 명확하지 않으면 도구를 호출하지 말고 텍스트로 되물으세요.",
    thinkingConfig: { thinkingBudget: 0 },
    maxOutputTokens: 500,
    tools: [{ functionDeclarations: [REQUEST_CARE_CALL_TOOL] }],
  },
});
if (ambiguous?.functionCall) {
  console.log("  ⚠ 모호한 명령인데 function call이 나왔습니다(잘못된 일정에 명령이 실행될 위험) — 프롬프트/모델 점검 필요");
  failures++;
}

console.log(failures === 0 ? "\n✅ 모두 정상입니다." : `\n❌ ${failures}건의 문제가 있습니다. 위 로그를 확인하세요.`);
process.exit(failures === 0 ? 0 : 1);
