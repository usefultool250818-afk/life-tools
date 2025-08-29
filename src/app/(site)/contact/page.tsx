// src/app/(site)/contact/page.tsx
import type { Metadata } from "next";
import { ContactForm } from "../../ContactForm"; // ← 大文字小文字まで一致

export const metadata: Metadata = {
  title: "お問い合わせ | life-tools.jp",
  description: "life-tools.jp へのお問い合わせフォームです。",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight">お問い合わせ</h1>
      <p className="text-slate-600 mt-2">ご意見・ご要望・不具合報告など、お気軽にお送りください。</p>
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="p-6 md:p-8">
          <ContactForm />
          <p className="mt-6 text-xs text-slate-500">
            送信内容は
            <a className="underline hover:text-indigo-600" href="/privacy-policy">プライバシーポリシー</a>
            に基づき取り扱います。
          </p>
        </div>
      </div>
    </div>
  );
}
