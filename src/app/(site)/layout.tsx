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

        {/* フッター */}
        <footer className="mt-20 border-t border-slate-200 bg-white/60">
          <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-slate-600 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>&copy; {new Date().getFullYear()} life-tools.jp</div>
            <nav className="flex flex-wrap gap-4" aria-label="フッターナビゲーション">
              <Link href="/privacy-policy" className="hover:text-indigo-600">
                プライバシーポリシー
              </Link>
              <Link href="/disclaimer" className="hover:text-indigo-600">
                免責事項
              </Link>
              {/* 後で実装予定の場合はコメントを外してください */}
              {/* <Link href="/contact" className="hover:text-indigo-600">お問い合わせ</Link> */}
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
