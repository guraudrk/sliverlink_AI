import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const pretendard = localFont({
  src: "../../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2",
  display: "swap",
  weight: "45 920",
  variable: "--font-pretendard",
});

export const metadata: Metadata = {
  title: "SilverLink AI",
  description: "생활지원사가 어르신 30명과 통화한 뒤 기록을 입력하는 시간을, 0으로 만드는 SilverLink AI",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2563eb",
  viewportFit: "cover",
};

const themeScript = `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark');}}catch(e){}})();`;
const swScript = `if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){});})}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${pretendard.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: swScript }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
