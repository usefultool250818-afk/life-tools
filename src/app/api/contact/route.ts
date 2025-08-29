// src/app/api/contact/route.ts
import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { name = "", email = "", message = "", hp = "" } = body ?? {};

    // 簡易バリデーション
    if (hp) {
      // ハニーポット（bot対策）：hiddenフィールドが埋まっている投稿は拒否
      return NextResponse.json({ ok: true }, { status: 200 });
    }
    if (!name || !email || !message) {
      return NextResponse.json({ ok: false, error: "必須項目が未入力です。" }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ ok: false, error: "メールアドレスの形式が不正です。" }, { status: 400 });
    }

    const to = process.env.CONTACT_TO!;
    const from = process.env.CONTACT_FROM || "onboarding@resend.dev";

    const subject = `【お問い合わせ】${name} さんより`;
    const text = [
      `お名前: ${name}`,
      `メール: ${email}`,
      "",
      "―― メッセージ ――",
      message,
      "",
      `送信日時: ${new Date().toISOString()}`,
    ].join("\n");

    const { error } = await resend.emails.send({
      from,
      to,
      replyTo: email, // 返信ボタンで送信者に返せるように
      subject,
      text,
    });

    if (error) {
      console.error(error);
      return NextResponse.json({ ok: false, error: "送信に失敗しました。" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: "サーバーエラーが発生しました。" }, { status: 500 });
  }
}
