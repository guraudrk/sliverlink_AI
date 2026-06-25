"use client";

import { useEffect, useState, type FormEvent, type SVGProps } from "react";
import { NOTIFICATION_PREFERENCE_OPTIONS, type ParentProfile } from "@/lib/supabase/parent-profiles-repo";

type Status = "idle" | "submitting" | "success" | "error";

const NOTIFICATION_PREFERENCE_LABELS: Record<(typeof NOTIFICATION_PREFERENCE_OPTIONS)[number], string> = {
  none: "아직 미사용",
  sms: "SMS",
  kakao: "카카오 알림톡",
};

const EMPTY_FORM = {
  display_name: "",
  relationship: "",
  phone: "",
  notification_preference: "none" as (typeof NOTIFICATION_PREFERENCE_OPTIONS)[number],
  care_context: "",
  daily_routine: "",
  medication_notes: "",
  communication_style: "",
  memo: "",
};

function formToValues(profile: ParentProfile): typeof EMPTY_FORM {
  return {
    display_name: profile.display_name,
    relationship: profile.relationship ?? "",
    phone: profile.phone ?? "",
    notification_preference: profile.notification_preference ?? "none",
    care_context: profile.care_context ?? "",
    daily_routine: profile.daily_routine ?? "",
    medication_notes: profile.medication_notes ?? "",
    communication_style: profile.communication_style ?? "",
    memo: profile.memo ?? "",
  };
}

type ParentProfileFormProps =
  | { mode?: "create"; onSaved: (profile: ParentProfile) => void; profile?: undefined; onCancelEdit?: undefined }
  | { mode: "edit"; profile: ParentProfile; onSaved: (profile: ParentProfile) => void; onCancelEdit: () => void };

export function ParentProfileForm(props: ParentProfileFormProps) {
  const isEditProps = props.mode === "edit";
  const onSaved = props.onSaved;
  const [form, setForm] = useState(isEditProps ? formToValues(props.profile) : EMPTY_FORM);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

  // 수정 대상이 바뀌면(다른 프로필 클릭) 폼 내용을 그 프로필 값으로 다시 채운다.
  useEffect(() => {
    if (props.mode === "edit") {
      setForm(formToValues(props.profile));
      setStatus("idle");
      setMessage(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.mode === "edit" ? props.profile.id : null]);

  const isSubmitting = status === "submitting";

  function updateField<K extends keyof typeof EMPTY_FORM>(key: K, value: typeof EMPTY_FORM[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setMessage(null);

    const url = props.mode === "edit" ? `/api/parents/${props.profile.id}` : "/api/parents";
    const method = props.mode === "edit" ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setStatus("error");
        setMessage(isEditProps ? "수정에 실패했어요. 다시 시도해 주세요." : "등록에 실패했어요. 다시 시도해 주세요.");
        return;
      }

      setStatus("success");
      setMessage(
        isEditProps ? `${form.display_name} 정보를 수정했어요.` : `${form.display_name} 프로필을 등록했어요.`
      );
      onSaved(data.profile as ParentProfile);
      if (!isEditProps) {
        setForm(EMPTY_FORM);
      }
    } catch {
      setStatus("error");
      setMessage("네트워크 연결을 확인하고 다시 시도해 주세요.");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-800">
            {isEditProps ? "부모님/어르신 정보 수정" : "부모님/어르신 등록"}
          </h2>
          <p className="text-slate-500">
            {isEditProps ? "내용을 고치고 저장해 주세요." : "돌봄 대상 한 분씩 등록해 주세요."}
          </p>
        </div>
        {props.mode === "edit" ? (
          <button
            type="button"
            onClick={props.onCancelEdit}
            className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-100"
          >
            취소
          </button>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="display_name" className="block text-sm font-semibold text-slate-700">
            표시 이름 *
          </label>
          <input
            id="display_name"
            required
            value={form.display_name}
            onChange={(event) => updateField("display_name", event.target.value)}
            placeholder="예) 아버지"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="relationship" className="block text-sm font-semibold text-slate-700">
            관계
          </label>
          <input
            id="relationship"
            value={form.relationship}
            onChange={(event) => updateField("relationship", event.target.value)}
            placeholder="예) 아버지, 어머니"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="phone" className="block text-sm font-semibold text-slate-700">
            연락처
          </label>
          <input
            id="phone"
            value={form.phone}
            onChange={(event) => updateField("phone", event.target.value)}
            placeholder="예) 010-0000-0000"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="notification_preference" className="block text-sm font-semibold text-slate-700">
            알림 채널 (향후 사용)
          </label>
          <select
            id="notification_preference"
            value={form.notification_preference}
            onChange={(event) =>
              updateField(
                "notification_preference",
                event.target.value as (typeof NOTIFICATION_PREFERENCE_OPTIONS)[number]
              )
            }
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          >
            {NOTIFICATION_PREFERENCE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {NOTIFICATION_PREFERENCE_LABELS[option]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="care_context" className="block text-sm font-semibold text-slate-700">
          돌봄 맥락 (향후 AI 참고용)
        </label>
        <textarea
          id="care_context"
          rows={2}
          value={form.care_context}
          onChange={(event) => updateField("care_context", event.target.value)}
          placeholder="예) 최근 약 복용 확인이 필요함"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="daily_routine" className="block text-sm font-semibold text-slate-700">
          평소 루틴
        </label>
        <textarea
          id="daily_routine"
          rows={2}
          value={form.daily_routine}
          onChange={(event) => updateField("daily_routine", event.target.value)}
          placeholder="예) 오전 9시에 약, 오후 3시에 산책"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="medication_notes" className="block text-sm font-semibold text-slate-700">
          복약 메모
        </label>
        <textarea
          id="medication_notes"
          rows={2}
          value={form.medication_notes}
          onChange={(event) => updateField("medication_notes", event.target.value)}
          placeholder="예) 혈압약 복용 알림 필요"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="communication_style" className="block text-sm font-semibold text-slate-700">
          대화 말투
        </label>
        <input
          id="communication_style"
          value={form.communication_style}
          onChange={(event) => updateField("communication_style", event.target.value)}
          placeholder="예) 짧고 다정하게 말하기"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="memo" className="block text-sm font-semibold text-slate-700">
          기타 메모
        </label>
        <input
          id="memo"
          value={form.memo}
          onChange={(event) => updateField("memo", event.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-base text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-base font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
      >
        {isSubmitting ? "저장하는 중..." : isEditProps ? "수정하기" : "등록하기"}
      </button>

      {status !== "idle" && message ? (
        <div
          role={status === "success" ? "status" : "alert"}
          aria-live="polite"
          className={
            status === "success"
              ? "flex items-start gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"
              : "flex items-start gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"
          }
        >
          {status === "success" ? (
            <CheckIcon className="mt-0.5 h-5 w-5 flex-shrink-0" />
          ) : (
            <AlertIcon className="mt-0.5 h-5 w-5 flex-shrink-0" />
          )}
          <span>{message}</span>
        </div>
      ) : null}
    </form>
  );
}

function CheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" {...props}>
      <path
        fillRule="evenodd"
        d="M16.704 5.29a1 1 0 010 1.415l-7.07 7.071a1 1 0 01-1.415 0L3.296 8.852a1 1 0 111.415-1.414l4.214 4.213 6.364-6.364a1 1 0 011.415.003z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function AlertIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" {...props}>
      <path
        fillRule="evenodd"
        d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.63-1.516 2.63H3.72c-1.347 0-2.189-1.463-1.516-2.63L8.485 2.495zM10 6a1 1 0 00-1 1v3a1 1 0 002 0V7a1 1 0 00-1-1zm0 7a1 1 0 100 2 1 1 0 000-2z"
        clipRule="evenodd"
      />
    </svg>
  );
}
