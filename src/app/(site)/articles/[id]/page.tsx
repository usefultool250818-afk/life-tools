// app/(site)/articles/[id]/page.tsx
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Metadata } from "next";
import { client } from "@/lib/microcms";

// 取得データの型（必要に応じて拡張）
type Article = {
  id: string;
  title: string;
  body: string; // テキストエリア（Markdown文字列）
  thumbnail?: { url: string; width?: number; height?: number };
};

// ※ 動的レンダリングを明示
export const dynamic = "force-dynamic";

// （任意）SEO: タイトルだけでも設定すると◎
export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const { data: article } = await client.get<Article>(`/articles/${params.id}`);
  return { title: article.title };
}

export default async function ArticleDetail({
  params,
}: {
  params: { id: string };
}) {
  // axios なのでパスで呼び出し、ジェネリクスで型を渡す
  const { data: article } = await client.get<Article>(`/articles/${params.id}`);

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
