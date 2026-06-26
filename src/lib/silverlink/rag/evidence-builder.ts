import type { RagEvidence, RagImportance, RagQueryCategory } from "./types";
import type { RagEvidenceSourceRows } from "@/lib/supabase/rag-evidence-repo";

const STATUS_LABELS: Record<string, string> = {
  scheduled: "예정",
  completed: "완료",
  help_requested: "도움 요청",
  snoozed: "나중에",
};

const IMPORTANCE_RANK: Record<RagImportance, number> = { high: 0, medium: 1, low: 2 };

function careTaskImportance(row: { status: string; priority: string | null }): RagImportance {
  if (row.status === "help_requested") return "high";
  if (row.priority === "high") return "medium";
  return "low";
}

function callAttemptImportance(row: { risk_level: string; status: string }): RagImportance {
  if (row.risk_level === "high" || row.status === "help_requested") return "high";
  if (row.risk_level === "medium") return "medium";
  return "low";
}

function buildEvidenceFromRows(rows: RagEvidenceSourceRows): RagEvidence[] {
  const evidence: RagEvidence[] = [];

  for (const profile of rows.parentProfiles) {
    const parts = [profile.care_context, profile.daily_routine, profile.medication_notes, profile.communication_style].filter(
      (part): part is string => Boolean(part)
    );
    if (parts.length === 0) continue;
    evidence.push({
      id: `parent_profile:${profile.id}`,
      sourceType: "parent_profile",
      parentId: profile.id,
      title: `${profile.display_name} 프로필`,
      summary: parts.join(" / "),
      rawText: parts.join("\n"),
      createdAt: new Date(0).toISOString(),
      importance: "medium",
      safetyFlags: profile.medication_notes ? ["medication_related"] : [],
    });
  }

  for (const task of rows.careTasks) {
    evidence.push({
      id: `care_task:${task.id}`,
      sourceType: "care_task",
      parentId: task.parent_id,
      title: `일정 - ${STATUS_LABELS[task.status] ?? task.status}`,
      summary: task.original_request ?? "(내용 없음)",
      rawText: task.original_request ?? "",
      createdAt: task.created_at,
      importance: careTaskImportance(task),
      safetyFlags: task.status === "help_requested" ? ["help_requested"] : [],
    });
  }

  for (const log of rows.messageLogs) {
    if (!log.parent_id) continue;
    evidence.push({
      id: `message_log:${log.id}`,
      sourceType: "message_log",
      parentId: log.parent_id,
      title: log.direction === "parent_response" ? "어르신 응답" : "메시지 기록",
      summary: log.raw_message ?? "(내용 없음)",
      rawText: log.raw_message ?? "",
      createdAt: log.created_at,
      importance: log.direction === "parent_response" ? "medium" : "low",
      safetyFlags: [],
    });
  }

  for (const queue of rows.notificationQueue) {
    evidence.push({
      id: `notification_queue:${queue.id}`,
      sourceType: "notification_queue",
      parentId: queue.parent_id,
      title: `알림(${queue.channel})`,
      summary: queue.expires_at ? `상태: ${queue.status}, 만료: ${queue.expires_at}` : `상태: ${queue.status}`,
      rawText: `${queue.channel} / ${queue.status}`,
      createdAt: queue.created_at,
      importance: queue.status === "responded" ? "medium" : "low",
      safetyFlags: [],
    });
  }

  for (const attempt of rows.careCallAttempts) {
    evidence.push({
      id: `care_call_attempt:${attempt.id}`,
      sourceType: "care_call_attempt",
      parentId: attempt.parent_id,
      title: "안부전화 기록",
      summary: attempt.parent_response ? `응답: ${attempt.parent_response}` : attempt.call_script ?? "(스크립트 없음)",
      rawText: [attempt.call_script, attempt.parent_response].filter(Boolean).join(" / "),
      createdAt: attempt.created_at,
      importance: callAttemptImportance(attempt),
      safetyFlags: attempt.risk_level !== "none" ? [`risk:${attempt.risk_level}`] : [],
    });
  }

  for (const delivery of rows.deliveryAttempts) {
    evidence.push({
      id: `delivery_attempt:${delivery.id}`,
      sourceType: "delivery_attempt",
      parentId: delivery.parent_id,
      title: `발송 시도(${delivery.provider})`,
      summary: `${delivery.channel} 채널, 상태: ${delivery.status}`,
      rawText: `${delivery.provider} / ${delivery.channel} / ${delivery.status}`,
      createdAt: delivery.attempted_at,
      importance: "low",
      safetyFlags: [],
    });
  }

  return evidence;
}

function filterByCategory(category: RagQueryCategory, evidence: RagEvidence[]): RagEvidence[] {
  switch (category) {
    case "help":
      return evidence.filter(
        (item) => item.safetyFlags.includes("help_requested") || item.safetyFlags.includes("risk:medium") || item.safetyFlags.includes("risk:high")
      );
    case "medication":
      return evidence.filter(
        (item) => item.safetyFlags.includes("medication_related") || item.rawText.includes("복약") || item.rawText.includes("혈압") || item.rawText.includes("당뇨")
      );
    case "calls":
      return evidence.filter((item) => item.sourceType === "care_call_attempt");
    case "task_request":
      // 새 일정 등록 명령은 근거로 답할 질문이 아니다 — 채팅 화면에 "근거 N건"이 뜨면 사용자가
      // 헷갈리므로, 어떤 근거가 모였든 항상 빈 배열을 반환한다.
      return [];
    case "summary":
    case "open":
    default:
      return evidence;
  }
}

function sortByImportanceThenRecency(evidence: RagEvidence[]): RagEvidence[] {
  return [...evidence].sort((a, b) => {
    const rankDiff = IMPORTANCE_RANK[a.importance] - IMPORTANCE_RANK[b.importance];
    if (rankDiff !== 0) return rankDiff;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

// category가 도움/복약/안부전화처럼 좁은 질문이면 관련 없는 항목을 걸러내고, summary/open이면 전체를 반환한다.
// 걸러낸 결과가 0건이면 그대로 빈 배열을 반환한다(없는 근거를 지어내지 않기 위한 신호 — Day13의 환각 방지에서 사용).
export function buildEvidence(category: RagQueryCategory, rows: RagEvidenceSourceRows): RagEvidence[] {
  const evidence = buildEvidenceFromRows(rows);
  const filtered = filterByCategory(category, evidence);
  return sortByImportanceThenRecency(filtered);
}
