import { client } from "../../../lib/microcms";

export default async function ArticlesPage() {
  const res = await client.get("/articles");
  const articles = res.data.contents;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">記事一覧</h2>
      <div className="grid gap-4">
        {articles.map((a: any) => (
          <a key={a.id} href={`/articles/${a.id}`}
             className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md">
            <h3 className="font-medium">{a.title}</h3>
            <p className="text-sm text-slate-600">{a.publishedAt}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
