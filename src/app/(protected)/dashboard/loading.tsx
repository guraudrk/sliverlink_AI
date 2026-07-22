function Bone({ w, h, radius = 8 }: { w: number | string; h: number; radius?: number }) {
  return (
    <div
      className="animate-pulse"
      style={{ width: w, height: h, borderRadius: radius, backgroundColor: "var(--sl-border)", flexShrink: 0 }}
    />
  );
}

export default function Loading() {
  return (
    <div style={{ backgroundColor: "var(--sl-bg)", minHeight: "100vh" }}>
      {/* 헤더 */}
      <div style={{ background: "linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)", paddingBottom: 32 }}>
        <div className="mx-auto max-w-2xl px-4 pt-10 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-2">
              <Bone w={96} h={12} radius={6} />
              <Bone w={176} h={28} radius={10} />
              <Bone w={128} h={28} radius={10} />
            </div>
            <div className="flex gap-2 pt-1">
              <Bone w={80} h={36} radius={12} />
              <Bone w={64} h={36} radius={12} />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-6 px-4 sm:px-6" style={{ marginTop: -20 }}>
        {/* 빠른 액세스 */}
        <div>
          <Bone w={72} h={10} radius={5} />
          <div className="mt-3 flex flex-col gap-3">
            {[0, 1].map((i) => (
              <div key={i} className="flex items-center gap-4"
                style={{ borderRadius: 20, padding: 20, backgroundColor: "var(--sl-card)", border: "1px solid var(--sl-border)" }}>
                <Bone w={52} h={52} radius={16} />
                <div className="flex flex-col gap-2 flex-1">
                  <Bone w="50%" h={14} radius={6} />
                  <Bone w="70%" h={11} radius={5} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 어르신 목록 */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <Bone w={88} h={10} radius={5} />
            <Bone w={48} h={10} radius={5} />
          </div>
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className="flex items-center gap-4"
                style={{ borderRadius: 20, padding: 16, backgroundColor: "var(--sl-card)", border: "1px solid var(--sl-border)" }}>
                <Bone w={44} h={44} radius={22} />
                <div className="flex flex-col gap-2 flex-1">
                  <Bone w="40%" h={14} radius={6} />
                  <Bone w="25%" h={11} radius={5} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 더 보기 */}
        <div>
          <Bone w={56} h={10} radius={5} />
          <div className="mt-3 overflow-hidden"
            style={{ borderRadius: 20, backgroundColor: "var(--sl-card)", border: "1px solid var(--sl-border)" }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3.5"
                style={{ borderBottom: i < 3 ? "1px solid var(--sl-border)" : "none" }}>
                <Bone w={36} h={36} radius={10} />
                <Bone w="45%" h={12} radius={5} />
              </div>
            ))}
          </div>
        </div>

        <div style={{ height: 32 }} />
      </div>
    </div>
  );
}
