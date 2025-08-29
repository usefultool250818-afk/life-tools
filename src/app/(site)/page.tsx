// src/app/(site)/page.tsx
import { Section } from "@/components/section";
import { Card } from "@/components/card";
import { client } from "@/lib/microcms";

// ISR（5分ごとに新着を取り直す）
export const revalidate = 300;

type Article = {
  id: string;
  title: string;
  body?: string;         // リッチエディタのHTML
  publishedAt?: string;  // microCMSのシステムフィールド
};

// HTMLをプレーンテキスト化して短くするユーティリティ
function excerptFromHtml(html?: string, max = 60) {
  if (!html) return "";
  const text = html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  return text.length > max ? text.slice(0, max) + "…" : text;
}

export default async function Home() {
  // ツールは手動キュレーション（そのままでOK）
  const featuredTools = [
    { title: "キャッシュフロープランナー", href: "/tools/cashflow-planner", desc: "家計の未来を見える化" },
    { title: "QRコード生成", href: "/tools/qr-generator", desc: "URLや文字列から即生成" },
    { title: "文字数カウンター", href: "/tools/moji-counter", desc: "文章の長さを即確認" },
  ];

  // ★ microCMS から新着記事を取得（最新6件）
  //   fields で必要最小限に絞ると高速＆安全
  const { data } = await client.get<{ contents: Article[] }>("/articles", {
    params: {
      limit: 6,
      orders: "-publishedAt",
      fields: "id,title,body,publishedAt",
    },
  });
  const newArticles = (data?.contents ?? []).map((a) => ({
    title: a.title,
    href: `/articles/${a.id}`,                 // まだ slug を作ってない想定なので ID でOK
    desc: excerptFromHtml(a.body, 60),         // 本文HTMLから60文字の抜粋
  }));

  // いまは未実装。PV等を集計できるようになったら差し替え
  const popularArticles: typeof newArticles = [];

  return (
    <div className="space-y-12">
      {/* Hero + 検索 */}
      <section className="text-center space-y-4">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight">FP向けライフプラン＆便利ツール</h2>
        <p className="text-slate-600 max-w-2xl mx-auto">
          シンプルでわかりやすいツールと記事で、日常や業務をスマートに。
        </p>
        <form action="/search" className="max-w-xl mx-auto">
          <input
            name="q"
            placeholder="ツール名・記事名・キーワードで検索"
            className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 shadow-sm focus:outline-none focus:ring-4 focus:ring-indigo-100"
          />
        </form>
        <div className="flex flex-wrap gap-2 justify-center text-sm">
          {["家計", "教育費", "住宅ローン", "老後"].map((x) => (
            <a key={x} href={`/search?q=${encodeURIComponent(x)}`} className="rounded-full border border-slate-300 bg-white px-3 py-1 hover:bg-slate-50">
              {x}
            </a>
          ))}
        </div>
      </section>

      {/* 注目のツール（最大6） */}
      <Section title="注目のツール" href="/tools">
        <div className="grid gap-6 md:grid-cols-3">
          {featuredTools.map((t) => <Card key={t.href} {...t} />)}
        </div>
      </Section>

      {/* 新着記事（最大6） */}
      <Section title="新着記事" href="/articles?sort=newest">
        <div className="grid gap-6 md:grid-cols-3">
          {newArticles.length > 0 ? (
            newArticles.map((a) => <Card key={a.href} {...a} />)
          ) : (
            <div className="text-slate-500">まだ記事がありません。</div>
          )}
        </div>
      </Section>

      {/* 人気記事（将来PV集計できたら表示） */}
      {popularArticles.length > 0 && (
        <Section title="人気の記事" href="/articles?sort=popular">
          <div className="grid gap-6 md:grid-cols-3">
            {popularArticles.map((a) => <Card key={a.href} {...a} />)}
          </div>
        </Section>
      )}
    </div>
  );
}
