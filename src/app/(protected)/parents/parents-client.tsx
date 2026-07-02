"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ParentProfileForm } from "@/components/parents/parent-profile-form";
import { ParentProfileList } from "@/components/parents/parent-profile-list";
import type { ParentProfile } from "@/lib/supabase/parent-profiles-repo";

const REDIRECT_DELAY_MS = 1200;

interface Props {
  initialProfiles: ParentProfile[];
}

export function ParentsClient({ initialProfiles }: Props) {
  const router = useRouter();
  const [profiles, setProfiles] = useState<ParentProfile[]>(initialProfiles);
  const [editingProfile, setEditingProfile] = useState<ParentProfile | null>(null);

  return (
    <div className="flex flex-1 flex-col items-center bg-slate-50 px-4 py-10 sm:py-16">
      <div className="w-full max-w-xl space-y-6">
        <div className="space-y-1 animate-rag-fade-in-up">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">SilverLink AI</p>
          <h1 className="text-2xl font-bold text-slate-900">부모님/어르신 관리</h1>
          <p className="text-slate-500">
            내가 등록한 부모님/어르신만 보이고, 다른 회원에게는 보이지 않아요. 항목을 클릭하면 수정할 수 있어요.
          </p>
        </div>

        <div className="animate-rag-fade-in-up" style={{ animationDelay: "70ms" }}>
        <ParentProfileList
          profiles={profiles}
          loading={false}
          onSelect={setEditingProfile}
          selectedId={editingProfile?.id}
        />
        </div>

        <div className="animate-rag-fade-in-up" style={{ animationDelay: "140ms" }}>
        {editingProfile ? (
          <ParentProfileForm
            mode="edit"
            profile={editingProfile}
            onCancelEdit={() => setEditingProfile(null)}
            onSaved={(updated) => {
              setProfiles((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
              setEditingProfile(null);
            }}
          />
        ) : (
          <ParentProfileForm
            onSaved={(profile) => {
              setProfiles((prev) => [profile, ...prev]);
              setTimeout(() => router.push("/dashboard"), REDIRECT_DELAY_MS);
            }}
          />
        )}
        </div>
      </div>
    </div>
  );
}
