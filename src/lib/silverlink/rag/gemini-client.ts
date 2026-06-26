import { GoogleGenAI } from "@google/genai";

// embedding.ts와 answer-generator.ts가 똑같은 "키 확인 + 클라이언트 캐시" 로직을 필요로 해서 공유 함수로 뽑았다.
let cachedClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY가 설정되어 있지 않습니다.");
  }
  cachedClient = new GoogleGenAI({ apiKey });
  return cachedClient;
}

// 모델명 churn이 심해(과거 gemini-2.0-flash가 이미 shut down됐다) 환경 변수로만 참조한다.
// 직접 호출로 비교한 결과: gemini-3-flash-preview는 preview라 무료 한도가 하루 20건뿐이라 바로
// 소진됐고(429), 막 나온 GA 모델 gemini-3.5-flash는 한도는 넉넉하지만 수요 폭주로 503 UNAVAILABLE이
// 계속 났다(재시도 1번을 거쳐도 또 503). gemini-2.5-flash는 같은 조건에서 안정적으로 1~2초 내 응답하고
// function calling도 정확해서 기본값으로 선택했다. 단, gemini-2.5-flash는 thinkingLevel을 지원하지
// 않고 thinkingBudget(숫자)만 받는다(assistant-response.ts에서 thinkingBudget: 0 사용) — 이후 다시
// gemini-3.x 계열로 바꾸면 그 부분도 같이 thinkingLevel로 되돌려야 한다.
export function getLlmModel(): string {
  return process.env.GEMINI_LLM_MODEL ?? "gemini-2.5-flash";
}
