// src/app/(site)/articles/[id]/page.tsx
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Metadata } from "next";
import { client } from "@/lib/microcms";

type Article = {
  id: string;
  title: string;
  body: string; // Markdown 文字列
  thumbnail?: { url: string; width?: number; height?: number };
};

// 動的レンダリング（ISRせず常に最新を取りにいく）
export const dynamic = "force-dynamic";

// ── SEO（タイトルだけでも設定推奨）
export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params;                         // ★ ここがポイント
  const { data: article } = await client.get<Article>(`/articles/${id}`);
  return { title: article.title };
}

export default async function ArticleDetail(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;                         // ★ ここがポイント
  const { data: article } = await client.get<Article>(`/articles/${id}`);

  return (
    <article className="prose prose-lg prose-slate max-w-3xl mx-auto px-4 py-8">
      <h1 className="!mb-6">{article.title}</h1>

      {article.thumbnail && (
        <img
          src={article.thumbnail.url}
          alt=""
          className="rounded-lg"
          loading="lazy"
        />
      )}

      {/* Markdown を HTML に変換して表示 */}
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node, ...props }) => (
            <a
              {...props}
              className="inline-block px-6 py-3 mt-6 text-white font-semibold bg-indigo-600 rounded-xl shadow hover:bg-indigo-700 transition"
              target="_blank"
              rel="noopener noreferrer"
            />
          ),
        }}
      >
        {article.body}
      </ReactMarkdown>
    </article>
  );
}
