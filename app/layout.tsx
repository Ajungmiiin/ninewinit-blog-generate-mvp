import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "나인위닛 AI 기반 블로그 자동화",
  description: "나인위닛 AI 기반 블로그 자동 생성기",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`h-full`}>
      <body className="flex min-h-full flex-col">
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
