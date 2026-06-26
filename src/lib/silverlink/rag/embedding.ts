import { getGeminiClient } from "./gemini-client";

// rag_documents.embedding이 vector(768)이라, gemini-embedding-001(기본 3072차원)을 MRL 기법으로
// 768차원으로 줄여 받는다. 이 값을 바꾸려면 Supabase 쪽 vector(N) 컬럼도 같이 바꿔야 한다.
export const EMBEDDING_DIMENSIONS = 768;

function getEmbeddingModel(): string {
  // 모델명이 churn이 심해(text-embedding-004도 이미 폐지됨) 환경 변수로만 참조한다.
  return process.env.GEMINI_EMBEDDING_MODEL ?? "gemini-embedding-001";
}

// 임베딩 파이프라인(배치 적재)용 — 여러 텍스트를 한 번의 API 호출로 임베딩한다.
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const response = await getGeminiClient().models.embedContent({
    model: getEmbeddingModel(),
    contents: texts,
    config: { outputDimensionality: EMBEDDING_DIMENSIONS },
  });

  const embeddings = response.embeddings;
  if (!embeddings || embeddings.length !== texts.length) {
    throw new Error("Gemini 임베딩 응답 개수가 입력 텍스트 개수와 일치하지 않습니다.");
  }

  return embeddings.map((embedding, index) => {
    const values = embedding.values;
    if (!values) {
      throw new Error(`Gemini 임베딩 응답 ${index}번째 항목에 values가 없습니다.`);
    }
    return values;
  });
}

// 질문 1건을 임베딩할 때(검색 시점)용 — embedTexts의 단건 편의 함수.
export async function embedText(text: string): Promise<number[]> {
  const [embedding] = await embedTexts([text]);
  return embedding;
}
