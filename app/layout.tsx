import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "人材・タスク管理ダッシュボード",
  description: "社内用の人材・タスク管理ダッシュボード",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}