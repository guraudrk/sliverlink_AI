import webpush from "web-push";
import type { PushSubscription } from "@/lib/supabase/push-subscriptions-repo";

let initialized = false;

function ensureInitialized() {
  if (initialized) return;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.VAPID_EMAIL ?? "mailto:no-reply@example.com";
  if (!pub || !priv) return; // 미설정 시 조용히 skip
  webpush.setVapidDetails(
    email.startsWith("mailto:") ? email : `mailto:${email}`,
    pub,
    priv
  );
  initialized = true;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  icon?: string;
};

export async function sendPushToSubscriptions(
  subscriptions: PushSubscription[],
  payload: PushPayload
): Promise<void> {
  if (!process.env.VAPID_PRIVATE_KEY || subscriptions.length === 0) return;
  ensureInitialized();

  const content = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? "/dashboard/alerts",
    icon: payload.icon ?? "/logo.png.png",
  });

  await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        content
      )
    )
  );
}
