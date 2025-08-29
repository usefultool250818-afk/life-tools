"use client";

import { useState } from "react";

export function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", message: "", hp: "" });
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();

      if (!res.ok || !json.ok) {
        setStatus("error");
        setError(json.error || "送信に失敗しました。時間をおいて再度お試しください。");
        return;
      }
      setStatus("done");
      setForm({ name: "", email: "", message: "", hp: "" });
    } catch {
      setStatus("error");
      setError("ネットワークエラーが発生しました。");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* お名前 */}
      <div>
        <label className="block text-sm font-medium mb-1">お名前</label>
        <input
          type="text"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 shadow-sm focus:outline-none focus:ring-4 focus:ring-indigo-100"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
      </div>

      {/* メールアドレス */}
      <div>
        <label className="block text-sm font-medium mb-1">メールアドレス</label>
        <input
          type="email"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 shadow-sm focus:outline-none focus:ring-4 focus:ring-indigo-100"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
      </div>

      {/* お問い合わせ内容 */}
      <div>
        <label className="block text-sm font-medium mb-1">お問い合わせ内容</label>
        <textarea
          rows={6}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 shadow-sm focus:outline-none focus:ring-4 focus:ring-indigo-100"
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          required
        />
      </div>

      {/* ハニーポット（bot対策 / 画面非表示） */}
      <input
        type="text"
        name="company"
        value={form.hp}
        onChange={(e) => setForm({ ...form, hp: e.target.value })}
        className="hidden"
        autoComplete="off"
        tabIndex={-1}
      />

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={status === "sending"}
          className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 text-white font-medium shadow-sm hover:bg-indigo-700 disabled:opacity-60"
        >
          {status === "sending" ? "送信中…" : "送信する"}
        </button>

        {status === "done" && (
          <span className="text-green-600 text-sm">送信しました。ご連絡ありがとうございます！</span>
        )}
        {status === "error" && (
          <span className="text-red-600 text-sm">{error}</span>
        )}
      </div>
    </form>
  );
}
