export default function Home() {
  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Life Tools（ポータル）</h1>
      <p className="text-sm text-gray-600 mb-6">
        ツールと記事の入口です。順次整備していきます。
      </p>
      <ul className="list-disc pl-5 space-y-2">
        <li><a className="text-blue-600 underline" href="/cashflow-planner">💰 家計キャッシュフロープランナー</a></li>
        <li><a className="text-blue-600 underline" href="/qr-generator">📱 QRコードジェネレーター</a></li>
        <li><a className="text-blue-600 underline" href="/moji-counter">✍️ 文字数カウンター</a></li>
        <li><a className="text-blue-600 underline" href="/articles">📝 記事一覧</a></li>
      </ul>
    </main>
  );
}
