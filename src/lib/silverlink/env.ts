export type SilverLinkEnv = {
  makeWebhookUrl: string | undefined;
  dryRun: boolean;
};

function parseDryRun(value: string | undefined): boolean {
  // 기본값은 true (안전 우선). 명시적으로 "false"여야만 실제 호출을 허용한다.
  return value !== "false";
}

export function getSilverLinkEnv(): SilverLinkEnv {
  return {
    makeWebhookUrl: process.env.MAKE_WEBHOOK_URL,
    dryRun: parseDryRun(process.env.SILVERLINK_DRY_RUN),
  };
}
