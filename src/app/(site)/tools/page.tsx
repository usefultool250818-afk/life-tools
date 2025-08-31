export default function ToolsIndex() {
  const tools = [
    { href: "/tools/cashflow-planner", title: "キャッシュフロープランナー", desc: "家計の将来収支を可視化" },
    { href: "/tools/rougo-shisan-simulator", title: "老後資産シミュレーター", desc: "退職後の資産推移を試算" },
    { href: "/tools/qr-generator", title: "QRコード生成", desc: "テキストからQRを作成" },
    { href: "/tools/moji-counter", title: "文字数カウンター", desc: "テキストの文字数・行数を計測" },
  ] as const;

  return (
    <div className="space-y-3">
      <h2 className="text-2xl font-bold">ツール一覧</h2>
      <div className="grid gap-2">
        {tools.map((t) => (
          <a
            key={t.href}
            href={t.href}
            className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition"
          >
            <h3 className="font-medium">{t.title}</h3>
            <p className="text-sm text-slate-600">{t.desc}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
