"use client";

import { useState, useEffect } from "react";

type Status = "checking" | "unsupported" | "denied" | "unsubscribed" | "subscribed" | "ios_hint";

export function PushPermissionButton() {
  const [status, setStatus] = useState<Status>("checking");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      // iOS Safari (홈 화면에 추가 전) 또는 미지원 브라우저
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      setStatus(isIOS ? "ios_hint" : "unsupported");
      return;
    }

    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }

    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        setStatus(sub ? "subscribed" : "unsubscribed");
      })
      .catch(() => setStatus("unsubscribed"));
  }, []);

  async function subscribe() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) throw new Error("VAPID key not configured");

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey,
      });

      const json = sub.toJSON();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth,
        }),
      });
      setStatus("subscribed");
    } catch {
      if (Notification.permission === "denied") setStatus("denied");
    } finally {
      setBusy(false);
    }
  }

  async function unsubscribe() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setStatus("unsubscribed");
    } finally {
      setBusy(false);
    }
  }

  if (status === "checking") return null;

  if (status === "unsupported") {
    return (
      <p className="text-xs text-slate-400">이 브라우저는 푸시 알림을 지원하지 않아요.</p>
    );
  }

  if (status === "ios_hint") {
    return (
      <p className="rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-700 ring-1 ring-amber-200">
        📱 iPhone/iPad에서는 Safari 하단 공유 버튼 → <strong>홈 화면에 추가</strong> 후 알림이 작동해요.
      </p>
    );
  }

  if (status === "denied") {
    return (
      <p className="text-xs text-slate-400">
        브라우저 알림이 차단되어 있어요. 브라우저 설정에서 허용해 주세요.
      </p>
    );
  }

  if (status === "subscribed") {
    return (
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          알림 설정됨
        </span>
        <button
          type="button"
          disabled={busy}
          onClick={unsubscribe}
          className="text-xs text-slate-400 hover:text-rose-500 disabled:opacity-50"
        >
          {busy ? "처리 중..." : "해제"}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={subscribe}
      className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
    >
      🔔 {busy ? "설정 중..." : "안전 알림 받기"}
    </button>
  );
}
