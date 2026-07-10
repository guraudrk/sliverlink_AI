import { getGeminiClient, getLlmModel } from "../rag/gemini-client";

export type SignalType =
  | "physical"
  | "emotional"
  | "cognitive"
  | "nutrition"
  | "medication"
  | "safety"
  | "social";

export type SafetySignal = {
  type: SignalType;
  detected: boolean;
  note: string;
};

export type AudioAnalysisResult = {
  transcript: string;
  summary: string;
  risk_level: "none" | "low" | "medium" | "high";
  signals: SafetySignal[];
};

const ANALYSIS_PROMPT = `
다음은 어르신과 가족의 통화 오디오입니다. 아래 작업을 수행하세요.

1. 전체 대화를 한국어로 전사하세요. 대화가 들리지 않거나 무음이면 "(녹음 없음)"이라고 쓰세요.
2. 통화 내용을 2~3문장으로 요약하세요.
3. 아래 7가지 안전 신호를 각각 감지하세요:
   - physical: 신체·건강 이상 (통증, 질병, 낙상, 피로)
   - emotional: 정서 상태 (외로움, 우울, 불안, 슬픔)
   - cognitive: 인지 변화 (혼돈, 반복, 기억 문제, 날짜 혼동)
   - nutrition: 영양·수면 (식사 여부, 수면 질 언급)
   - medication: 약 복용·병원 방문 관련
   - safety: 생활 안전 (집 상태, 이동 위험, 사고 가능성)
   - social: 사회 연결 (고립, 외출, 방문자 여부)
4. 전반적 위험 수준을 판단하세요: none(이상 없음) / low(가벼운 주의) / medium(관심 필요) / high(즉각 확인 필요)

JSON 형식으로만 응답하세요. 마크다운 코드블록 없이, 순수 JSON만 출력하세요:
{
  "transcript": "전사 내용",
  "summary": "요약 내용",
  "risk_level": "none",
  "signals": [
    {"type": "physical", "detected": false, "note": ""},
    {"type": "emotional", "detected": false, "note": ""},
    {"type": "cognitive", "detected": false, "note": ""},
    {"type": "nutrition", "detected": false, "note": ""},
    {"type": "medication", "detected": false, "note": ""},
    {"type": "safety", "detected": false, "note": ""},
    {"type": "social", "detected": false, "note": ""}
  ]
}
`.trim();

export async function analyzeAudio(audioBase64: string): Promise<AudioAnalysisResult> {
  const client = getGeminiClient();
  const model = getLlmModel();

  const response = await client.models.generateContent({
    model,
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType: "audio/mp4",
              data: audioBase64,
            },
          },
          { text: ANALYSIS_PROMPT },
        ],
      },
    ],
  });

  const raw = response.text ?? "";
  const jsonStr = raw.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();

  let parsed: AudioAnalysisResult;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error(`Gemini 응답 JSON 파싱 실패: ${raw.slice(0, 200)}`);
  }

  return parsed;
}
