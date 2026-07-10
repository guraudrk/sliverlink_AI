import type { RagEvidence, RagSourceType } from "./types";

// Anthropic의 Contextual Retrieval(2024) 기법: 짧은 원문("완료했어요")은 그 자체로 임베딩해도
// 의미가 빈약해서, 임베딩하기 전에 "이게 어떤 맥락의 정보인지" 짧은 설명을 앞에 붙인다.
// 원문 자체는 LLM이 만들 수도 있지만, 우리 데이터는 이미 구조화돼 있어(sourceType/title/createdAt)
// 템플릿만으로도 같은 효과를 낼 수 있다 — 비용 0원, 속도도 빠르고 Day5/8/11/12/13의 code-first 원칙과도 맞는다.
const SOURCE_TYPE_LABELS: Record<RagSourceType, string> = {
  parent_profile: "프로필",
  care_task: "일정",
  message_log: "메시지",
  notification_queue: "알림",
  care_call_attempt: "안부전화",
  delivery_attempt: "발송 시도",
  call_recording: "통화 녹음",
};

// evidence-builder가 parent_profile 근거에 시점 없는 배경 정보임을 표시하려고 epoch(0)을 넣어둔다
// (rag-ui-meta.ts의 formatEvidenceDate와 같은 판단 기준).
const EPOCH_ISO = new Date(0).toISOString();

export function buildContextualText(evidence: RagEvidence): string {
  const label = SOURCE_TYPE_LABELS[evidence.sourceType];
  const dateText = evidence.createdAt === EPOCH_ISO ? "상시 배경 정보" : `${evidence.createdAt.slice(0, 10)} 작성`;
  return `이것은 ${label} 기록입니다 (${dateText}, 중요도: ${evidence.importance}). 제목: ${evidence.title}. 내용: ${evidence.rawText}`;
}
