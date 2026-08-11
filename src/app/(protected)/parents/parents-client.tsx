"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ParentProfileForm } from "@/components/parents/parent-profile-form";
import { ParentProfileList } from "@/components/parents/parent-profile-list";
import type { ParentProfile } from "@/lib/supabase/parent-profiles-repo";
import { deleteParentProfile } from "@/lib/supabase/parent-profiles-repo";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const REDIRECT_DELAY_MS = 1200;

interface Props {
  initialProfiles: ParentProfile[];
}

export function ParentsClient({ initialProfiles }: Props) {
  const router = useRouter();
  const [profiles, setProfiles] = useState<ParentProfile[]>(initialProfiles);
  const [editingProfile, setEditingProfile] = useState<ParentProfile | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete(id: string) {
    const supabase = createSupabaseBrowserClient();
    try {
      await deleteParentProfile(supabase, id);
      setProfiles((prev) => prev.filter((p) => p.id !== id));
      setDeleteError(null);
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "삭제에 실패했습니다.");
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center bg-slate-50 px-4 py-10 sm:py-16">
      <div className="w-full max-w-xl space-y-6">
        <div className="space-y-1 animate-rag-fade-in-up">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">SilverLink AI</p>
          {deleteError && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{deleteError}</p>
          )}
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl font-bold text-slate-900">부모님/어르신 관리</h1>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              + 어르신 등록
            </button>
          </div>
          <p className="text-slate-500">
            내가 등록한 부모님/어르신만 보이고, 다른 회원에게는 보이지 않아요. 항목을 클릭하면 수정할 수 있어요.
          </p>
        </div>

        <div className="animate-rag-fade-in-up" style={{ animationDelay: "70ms" }}>
          <ParentProfileList
            profiles={profiles}
            loading={false}
            onSelect={setEditingProfile}
            selectedId={undefined}
            onDelete={handleDelete}
          />
        </div>
      </div>

      {/* 등록 모달 */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-10"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="w-full max-w-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <ParentProfileForm
              onSaved={(profile) => {
                setProfiles((prev) => [profile, ...prev]);
                setShowAddModal(false);
                setTimeout(() => router.push("/dashboard"), REDIRECT_DELAY_MS);
              }}
            />
          </div>
        </div>
      )}

      {/* 수정 모달 오버레이 */}
      {editingProfile && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-10"
          onClick={() => setEditingProfile(null)}
        >
          <div
            className="w-full max-w-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <ParentProfileForm
              mode="edit"
              profile={editingProfile}
              onCancelEdit={() => setEditingProfile(null)}
              onSaved={(updated) => {
                setProfiles((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
                setEditingProfile(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
