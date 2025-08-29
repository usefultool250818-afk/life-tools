// src/app/(site)/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "life-tools.jp",
  description: "ライフプラン&便利ツール集",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="bg-slate-50 text-slate-900 antialiased">
        {/* 固定ヘッダー */}
        <header className="fixed top-0 left-0 w-full z-50 border-b border-slate-200 bg-white/80 backdrop-blur">
          <div className="mx-auto max-w-6xl px-4 py-4">
            <h1 className="text-xl font-bold">
              <Link href="/" className="hover:text-indigo-600 transition">
                life-tools
              </Link>
            </h1>
          </div>
        </header>

        {/* ヘッダー分の余白を追加 */}
        <main className="mx-auto max-w-6xl px-4 pt-20 pb-10">
          {children}
        </main>

        <footer className="mt-20 border-t border-slate-200 bg-white/60 py-6 text-center text-sm text-slate-500">
          &copy; {new Date().getFullYear()} life-tools.jp
        </footer>
      </body>
    </html>
  );
}
