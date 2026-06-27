import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#2563eb",
        }}
      >
        <svg width="110" height="110" viewBox="0 0 24 24" fill="white">
          <path d="M12 21s-7.5-4.6-10-9.3C0.5 8.4 2 4.5 5.6 3.6c2-.5 3.9.3 5 1.9.8-1.2 2.4-2.4 5-1.9C19.2 4.5 21.5 8.4 22 11.7 19.5 16.4 12 21 12 21z" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
