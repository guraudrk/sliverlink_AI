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

// 모델명 churn이 심해(과거 gemini-2.0-flash/2.5-flash도 이미 폐지 공지가 났다) 환경 변수로만 참조한다.
// gemini-3-flash-preview를 기본값으로 쓰는 이유: gemini-2.5-flash는 thinkingLevel을 지원하지 않고
// (직접 호출해보니 400 INVALID_ARGUMENT) 무료 한도도 분당 5회로 빡빡해서(직접 429를 맞아 확인) 제외했다.
export function getLlmModel(): string {
  return process.env.GEMINI_LLM_MODEL ?? "gemini-3-flash-preview";
}
