// src/app/(site)/contact/ContactForm.tsx
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
      {/* …フォーム本体（省略可。いまのままでOK）… */}
    </form>
  );
}
