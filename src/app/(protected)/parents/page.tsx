"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ParentProfileForm } from "@/components/parents/parent-profile-form";
import { ParentProfileList } from "@/components/parents/parent-profile-list";
import type { ParentProfile } from "@/lib/supabase/parent-profiles-repo";

const REDIRECT_DELAY_MS = 1200;

export default function ParentsPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<ParentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProfile, setEditingProfile] = useState<ParentProfile | null>(null);

  useEffect(() => {
    let active = true;

    fetch("/api/parents")
      .then((res) => res.json())
      .then((data) => {
        if (active && data.ok) {
          setProfiles(data.profiles as ParentProfile[]);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="flex flex-1 flex-col items-center bg-slate-50 px-4 py-10 sm:py-16">
      <div className="w-full max-w-xl space-y-6">
        <div className="space-y-1">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">SilverLink AI</p>
          <h1 className="text-2xl font-bold text-slate-900">부모님/어르신 관리</h1>
          <p className="text-slate-500">내가 등록한 부모님/어르신만 보이고, 다른 회원에게는 보이지 않아요. 항목을 클릭하면 수정할 수 있어요.</p>
        </div>

        <ParentProfileList
          profiles={profiles}
          loading={loading}
          onSelect={setEditingProfile}
          selectedId={editingProfile?.id}
        />

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
              // 등록 성공 메시지를 잠깐 보여준 뒤, 원래 들어왔던 대시보드로 돌아간다.
              setTimeout(() => router.push("/dashboard"), REDIRECT_DELAY_MS);
            }}
          />
        )}
      </div>
    </div>
  );
}
