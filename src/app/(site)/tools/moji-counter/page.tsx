"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export default function Page() {
  const [text, setText] = useState("");
  const [excludeSpaces, setExcludeSpaces] = useState(false);
  const [excludeNewlines, setExcludeNewlines] = useState(false);
  const [trimEdges, setTrimEdges] = useState(false);
  const [normalizeNFC, setNormalizeNFC] = useState(true);
  const [limit, setLimit] = useState<number | "">("");
  const [copied, setCopied] = useState<"text" | "stats" | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 入力の加工（UIオプション反映）
  const processed = useMemo(() => {
    let t = text;
    if (trimEdges) t = t.trim();
    if (normalizeNFC) {
      try {
        t = t.normalize("NFC");
      } catch {}
    }
    if (excludeNewlines) t = t.replace(/\r?\n/g, "");
    if (excludeSpaces) t = t.replace(/\s/g, "");
    return t;
  }, [text, excludeSpaces, excludeNewlines, trimEdges, normalizeNFC]);

  // 統計値
  const stats = useMemo(() => {
    const totalChars = [...processed].length; // サロゲート対応
    const totalCharsRaw = [...text].length;
    const lines = excludeNewlines ? 1 : (text.match(/\r?\n/g)?.length ?? 0) + 1;
    const wordMatches = processed
      .trim()
      .match(/[A-Za-z0-9_]+|[\u3040-\u30ff\u3400-\u9fff\uff66-\uff9f]+/g);
    const words = wordMatches ? wordMatches.length : processed.trim() ? 1 : 0;
    const bytesUtf8 = new Blob([processed], { type: "text/plain;charset=utf-8" }).size;

    const limitNumber = typeof limit === "number" ? limit : undefined;
    const over = limitNumber !== undefined ? Math.max(0, totalChars - limitNumber) : 0;
    const remain = limitNumber !== undefined ? Math.max(0, limitNumber - totalChars) : undefined;
    const ratio =
      limitNumber && limitNumber > 0
        ? Math.min(100, Math.round((totalChars / limitNumber) * 100))
        : 0;

    return { totalChars, totalCharsRaw, lines, words, bytesUtf8, limitNumber, over, remain, ratio };
  }, [processed, text, excludeNewlines, limit]);

  // 自動リサイズ＆軽いローカル保存
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(600, ta.scrollHeight) + "px";
  }, [text]);
  useEffect(() => {
    try {
      const t = localStorage.getItem("moji-counter:text");
      if (t) setText(t);
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("moji-counter:text", text);
    } catch {}
  }, [text]);

  // アクション
  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(processed);
      setCopied("text");
      setTimeout(() => setCopied(null), 1200);
    } catch {}
  };
  const handleCopyStats = async () => {
    const lines = [
      `文字数（適用後）: ${stats.totalChars}`,
      `文字数（元）    : ${stats.totalCharsRaw}`,
      `単語数          : ${stats.words}`,
      `行数            : ${stats.lines}`,
      `UTF-8バイト     : ${stats.bytesUtf8}`,
      ...(stats.limitNumber !== undefined
        ? [`上限: ${stats.limitNumber}`, `残り: ${stats.remain}`, `超過: ${stats.over}`]
        : []),
    ].join("\n");
    try {
      await navigator.clipboard.writeText(lines);
      setCopied("stats");
      setTimeout(() => setCopied(null), 1200);
    } catch {}
  };
  const handleDownload = () => {
    const blob = new Blob([processed], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "text.txt";
    a.click();
    URL.revokeObjectURL(url);
  };
  const handleClear = () => setText("");

  // Ctrl/Cmd+Enter でコピー
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (processed) handleCopyText();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [processed]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 md:py-14">
      {/* Hero */}
      <section className="text-center space-y-4">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">文字数カウンター</h1>
        <p className="text-slate-600 dark:text-slate-300">
          テキストを入力すると{" "}
          <span className="font-medium">文字数 / 単語 / 行 / UTF-8バイト</span>
          を即時集計。上限チェックやコピー・ダウンロードに対応。処理は
          <strong>ブラウザ内</strong>で完結します。
        </p>
      </section>

      {/* 2カラム */}
      <section className="mt-8 grid gap-6 md:gap-8 md:grid-cols-2">
        {/* 入力パネル */}
        <div className="rounded-2xl border bg-white/70 backdrop-blur p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-medium">テキスト</span>
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="ここにテキストを貼り付け/入力してください"
                aria-label="集計対象のテキスト"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm shadow-sm placeholder:text-slate-400
                           focus:outline-none focus:ring-4 focus:ring-indigo-100
                           dark:bg-slate-950 dark:border-slate-800"
                rows={10}
                spellCheck={false}
              />
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span aria-live="polite">{stats.totalCharsRaw} 文字（元テキスト）</span>
                <kbd className="rounded border bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:border-slate-700">
                  Ctrl/Cmd + Enter でコピー
                </kbd>
              </div>
            </label>

            {/* オプション */}
            <fieldset className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={excludeSpaces}
                  onChange={(e) => setExcludeSpaces(e.target.checked)}
                />
                空白を除外
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={excludeNewlines}
                  onChange={(e) => setExcludeNewlines(e.target.checked)}
                />
                改行を除外
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={trimEdges}
                  onChange={(e) => setTrimEdges(e.target.checked)}
                />
                両端トリム
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={normalizeNFC}
                  onChange={(e) => setNormalizeNFC(e.target.checked)}
                />
                正規化（NFC）
              </label>
            </fieldset>

            {/* 上限チェック */}
            <div className="grid grid-cols-1 gap-2">
              <label className="space-y-1">
                <span className="text-sm font-medium">文字数上限（任意）</span>
                <input
                  type="number"
                  min={1}
                  value={limit === "" ? "" : limit}
                  onChange={(e) =>
                    setLimit(e.target.value === "" ? "" : Math.max(1, Number(e.target.value)))
                  }
                  placeholder="例）400"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm
                             focus:outline-none focus:ring-4 focus:ring-indigo-100
                             dark:bg-slate-950 dark:border-slate-800"
                />
              </label>
              {typeof stats.limitNumber === "number" && (
                <>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800" aria-hidden="true">
                    <div
                      className={`h-full ${stats.over > 0 ? "bg-rose-500" : "bg-indigo-500"}`}
                      style={{ width: `${stats.ratio}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300">
                    <span>現在：{stats.totalChars} 文字</span>
                    {stats.over > 0 ? (
                      <span className="text-rose-600 dark:text-rose-400">超過：{stats.over}</span>
                    ) : (
                      <span>残り：{stats.remain}</span>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* 操作 */}
            <div className="flex flex-wrap gap-3 pt-1">
              <button
                onClick={handleCopyText}
                disabled={!processed}
                className="inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium shadow-sm
                           bg-indigo-600 text-white hover:bg-indigo-500 active:translate-y-[1px]
                           disabled:opacity-50 disabled:cursor-not-allowed"
                aria-live="polite"
              >
                {copied === "text" ? "コピーしました" : "テキストをコピー"}
              </button>
              <button
                onClick={handleCopyStats}
                disabled={!text}
                className="inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium shadow-sm
                           bg-white text-slate-900 hover:bg-slate-50 active:translate-y-[1px]
                           dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900
                           border-slate-300 dark:border-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                結果をコピー
              </button>
              <button
                onClick={handleDownload}
                disabled={!processed}
                className="inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium shadow-sm
                           bg-white text-slate-900 hover:bg-slate-50 active:translate-y-[1px]
                           dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900
                           border-slate-300 dark:border-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                .txtでダウンロード
              </button>
              <button
                onClick={handleClear}
                disabled={!text}
                className="inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium shadow-sm
                           bg-white text-slate-900 hover:bg-slate-50 active:translate-y-[1px]
                           dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900
                           border-slate-300 dark:border-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                クリア
              </button>
            </div>

            <p className="text-xs text-slate-500">
              個人情報や機密情報の入力はお控えください。集計は端末内で完結します（送信なし）。
            </p>
          </div>
        </div>

        {/* 結果パネル */}
        <div className="rounded-2xl border bg-white/70 backdrop-blur p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <StatCard label="文字数（適用後）" value={stats.totalChars} />
            <StatCard label="文字数（元）" value={stats.totalCharsRaw} />
            <StatCard label="単語数" value={stats.words} />
            <StatCard label="行数" value={stats.lines} />
            <StatCard label="UTF-8バイト" value={stats.bytesUtf8} />
            {typeof stats.limitNumber === "number" ? (
              <StatCard
                label={stats.over > 0 ? "超過" : "残り"}
                value={stats.over > 0 ? stats.over : stats.remain ?? 0}
                emphasis={stats.over > 0 ? "bad" : "good"}
              />
            ) : (
              <div className="rounded-xl border p-4 text-sm text-slate-500 dark:border-slate-800">
                上限を設定すると残数/超過を表示します
              </div>
            )}
          </div>

          <div className="mt-5 rounded-xl border p-4 text-sm text-slate-600 dark:text-slate-300 dark:border-slate-800">
            <ul className="list-disc pl-5 space-y-1">
              <li>「空白を除外」は半角/全角スペース、タブ、改行などの空白類をカウント対象から除きます。</li>
              <li>「正規化（NFC）」で合成文字を正規化し、環境差による文字数ブレを抑えます。</li>
              <li>UTF-8バイト数はAPI文字数や保存サイズの目安に便利です。</li>
            </ul>
          </div>
        </div>
      </section>

      <p className="mt-8 text-center text-xs text-slate-500">※ サーバー送信なし／ブラウザ内集計</p>
    </main>
  );
}

/* ====== 小さな表示カード ====== */
function StatCard({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: number;
  emphasis?: "good" | "bad";
}) {
  return (
    <div
      className={`rounded-xl border p-4 text-center dark:border-slate-800 ${
        emphasis === "bad"
          ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
          : emphasis === "good"
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
          : "bg-white/60 dark:bg-slate-950"
      }`}
    >
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}
