/**
 * 채널 인터페이스: 이메일 발송
 *
 * ENABLE_REAL_EMAIL=true 환경 변수가 설정된 경우에만 실제 발송.
 * 기본값은 false — 개발·스테이징 환경에서 실수 발송 방지.
 *
 * 구현체 교체 지점: sendReportEmail 내부에서만 provider 의존.
 * 나중에 알림톡 채널을 추가하려면 동일한 시그니처의 함수를 추가한다.
 */

export type ReportRow = {
  parent_id: string;
  period_start: string;
  period_end: string;
  paste_text: string | null;
  risk_level: string;
  parent_profiles: { display_name: string } | { display_name: string }[] | null;
};

export type SendReportEmailParams = {
  orgId: string;
  orgName: string;
  period: string;
  reports: ReportRow[];
  recipientEmails: string[];
};

export async function sendReportEmail(params: SendReportEmailParams): Promise<void> {
  const { orgName, period, reports, recipientEmails } = params;

  if (process.env.ENABLE_REAL_EMAIL !== "true") {
    console.log(
      `[email-sender] 실발송 비활성 (ENABLE_REAL_EMAIL != true). ` +
      `대상: ${recipientEmails.join(", ")}, 기관: ${orgName}, 기간: ${period}, 어르신 수: ${reports.length}`
    );
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY 환경 변수가 설정되지 않았습니다.");

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);

  const from  = process.env.EMAIL_FROM ?? "SilverLink <onboarding@resend.dev>";
  const html  = buildEmailBody(orgName, period, reports);
  const subject = `[SilverLink] ${orgName} 주간 케어 리포트 (${period})`;

  const { error } = await resend.emails.send({
    from,
    to: recipientEmails,
    subject,
    html,
  });

  if (error) throw new Error(`Resend 오류: ${error.message}`);
}

/** 어르신 목록을 HTML 테이블로 변환 (이메일 본문용) */
export function buildEmailBody(orgName: string, period: string, reports: ReportRow[]): string {
  const riskLabel = (level: string) =>
    level === "critical" ? "⚠️ 위험" : level === "warning" ? "🔶 주의" : "✅ 정상";

  const getName = (r: ReportRow) => {
    const p = r.parent_profiles;
    if (!p) return "";
    if (Array.isArray(p)) return p[0]?.display_name ?? "";
    return p.display_name;
  };

  const rows = reports
    .map(
      (r) =>
        `<tr>
          <td style="padding:6px 12px;border-bottom:1px solid #eee">${getName(r)}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #eee">${riskLabel(r.risk_level)}</td>
          <td style="padding:6px 12px;border-bottom:1px solid #eee;white-space:pre-line">${r.paste_text ?? ""}</td>
        </tr>`
    )
    .join("");

  return `
<div style="font-family:sans-serif;max-width:700px;margin:0 auto">
  <h2 style="color:#1e40af">SilverLink 주간 케어 리포트</h2>
  <p style="color:#475569">${orgName} · ${period}</p>
  <table style="width:100%;border-collapse:collapse;font-size:14px">
    <thead>
      <tr style="background:#f8fafc">
        <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e2e8f0">어르신</th>
        <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e2e8f0">상태</th>
        <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e2e8f0">기록 내용</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <p style="color:#94a3b8;font-size:12px;margin-top:24px">
    SilverLink · 이 메일은 자동 발송됩니다.
  </p>
</div>`;
}
