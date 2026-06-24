import { getSilverLinkEnv } from "./env";
import type { TaskRequestPayload } from "./schema";

const REQUEST_TIMEOUT_MS = 10_000;

export type MakeWebhookResult =
  | { ok: true; dryRun: true; payload: TaskRequestPayload }
  | { ok: true; dryRun: false }
  | { ok: false; error: "missing_webhook_url" }
  | { ok: false; error: "webhook_request_failed" };

export async function sendToMakeWebhook(payload: TaskRequestPayload): Promise<MakeWebhookResult> {
  const { makeWebhookUrl, dryRun } = getSilverLinkEnv();

  if (dryRun) {
    console.log("[silverlink] DRY_RUN: skipping Make webhook call", payload);
    return { ok: true, dryRun: true, payload };
  }

  if (!makeWebhookUrl) {
    console.error("[silverlink] MAKE_WEBHOOK_URL is not set");
    return { ok: false, error: "missing_webhook_url" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(makeWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      console.error("[silverlink] Make webhook responded with non-2xx status", response.status);
      return { ok: false, error: "webhook_request_failed" };
    }

    return { ok: true, dryRun: false };
  } catch (error) {
    console.error("[silverlink] Make webhook call failed", error);
    return { ok: false, error: "webhook_request_failed" };
  } finally {
    clearTimeout(timeout);
  }
}
