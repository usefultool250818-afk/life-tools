"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import QR, { QRCodeToStringOptions } from "qrcode";

type Level = "L" | "M" | "Q" | "H";

export default function Page() {
  // 入力と設定
  const [text, setText] = useState("");
  const [size, setSize] = useState<number>(320);
  const [level, setLevel] = useState<Level>("M");
  const [fg, setFg] = useState("#111827"); // slate-900
  const [bg, setBg] = useState("#ffffff");
  const [margin, setMargin] = useState<number>(2);

  // プレビュー
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [svgString, setSvgString] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<"png" | "svg" | null>(null);

  // Canvas生成（★ null安全に修正）
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const draw = async () => {
      try {
        setError(null);
        const ctx = canvas.getContext("2d");
        if (!text) {
          if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
          return;
        }
        await QR.toCanvas(canvas, text, {
          width: size,
          errorCorrectionLevel: level,
          color: { dark: fg, light: bg },
          margin,
        });
      } catch {
        setError("QRコードの生成に失敗しました。入力内容をご確認ください。");
      }
    };
    void draw();
  }, [text, size, level, fg, bg, margin]);

  // SVG生成（ダウンロード/コピー用）
  useEffect(() => {
    const makeSvg = async () => {
      if (!text) {
        setSvgString("");
        return;
      }
      try {
        const opts: QRCodeToStringOptions = {
          type: "svg",
          errorCorrectionLevel: level,
          color: { dark: fg, light: bg },
          margin,
        };
        const svg = await QR.toString(text, opts);
        setSvgString(svg);
      } catch {
        setSvgString("");
      }
    };
    void makeSvg();
  }, [text, level, fg, bg, margin]);

  // PNG コピー
  const handleCopyPng = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    await new Promise<void>((resolve) => {
      canvas.toBlob(async (blob) => {
        if (!blob) return resolve();
        try {
          await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
          setCopied("png");
          setTimeout(() => setCopied(null), 1200);
        } catch {
          // 非対応ブラウザは無視
        } finally {
          resolve();
        }
      }, "image/png");
    });
  };

  // PNG ダウンロード
  const handleDownloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "qrcode.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  // SVG コピー（テキストとして）
  const handleCopySvg = async () => {
    if (!svgString) return;
    try {
      await navigator.clipboard.writeText(svgString);
      setCopied("svg");
      setTimeout(() => setCopied(null), 1200);
    } catch {
      /* noop */
    }
  };

  // SVG ダウンロード
  const handleDownloadSvg = () => {
    if (!svgString) return;
    const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "qrcode.svg";
    a.click();
    URL.revokeObjectURL(url);
  };

  // ショートカット：Ctrl/Cmd + Enter で PNG コピー
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (text) void handleCopyPng();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [text]);

  // 誤り訂正レベルのラベル
  const ecLabels: Record<Level, string> = useMemo(
    () => ({
      L: "L（~7%復旧）",
      M: "M（~15%復旧）",
      Q: "Q（~25%復旧）",
      H: "H（~30%復旧）",
    }),
    []
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 md:py-14">
      {/* Hero */}
      <section className="text-center space-y-4">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">QRコード生成</h1>
        <p className="text-slate-600 dark:text-slate-300">
          テキストやURLを入力すると即時にQRを作成。
          <span className="font-medium"> PNG/SVGのコピー・ダウンロード</span> に対応。
          生成は<strong>ブラウザ内処理</strong>です。
        </p>
      </section>

      {/* Builder */}
      <section className="mt-8 grid gap-6 md:gap-8 md:grid-cols-2">
        {/* 入力フォーム */}
        <div className="rounded-2xl border bg-white/70 backdrop-blur p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="space-y-5">
            <label className="block space-y-2">
              <span className="text-sm font-medium">テキスト / URL</span>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={5}
                placeholder="https://example.com など（Ctrl/Cmd + Enter でPNGコピー）"
                aria-label="QRに変換するテキストまたはURL"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-slate-400
                           focus:outline-none focus:ring-4 focus:ring-indigo-100
                           dark:bg-slate-950 dark:border-slate-800"
              />
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span aria-live="polite">{text.length} 文字</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setText("https://example.com")}
                    className="rounded border px-2 py-1 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                    title="サンプルURLを挿入"
                  >
                    サンプルURL
                  </button>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.readText().then(setText).catch(() => {})}
                    className="rounded border px-2 py-1 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                    title="クリップボードから貼り付け"
                  >
                    貼り付け
                  </button>
                </div>
              </div>
            </label>

            {/* サイズ */}
            <div className="grid grid-cols-1 gap-2">
              <label className="space-y-1">
                <span className="text-sm font-medium">サイズ（px）</span>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={128}
                    max={1024}
                    step={16}
                    value={size}
                    onChange={(e) => setSize(Number(e.target.value))}
                    className="w-full"
                    aria-label="サイズ（スライダー）"
                  />
                  <input
                    type="number"
                    min={128}
                    max={1024}
                    value={size}
                    onChange={(e) =>
                      setSize(Math.min(1024, Math.max(128, Number(e.target.value) || 320)))
                    }
                    className="w-24 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm
                               focus:outline-none focus:ring-4 focus:ring-indigo-100
                               dark:bg-slate-950 dark:border-slate-800"
                    aria-label="サイズ（数値入力）"
                  />
                </div>
              </label>
            </div>

            {/* 誤り訂正 */}
            <fieldset className="space-y-2">
              <div className="text-sm font-medium">誤り訂正レベル</div>
              <div className="grid grid-cols-4 gap-2">
                {(["L", "M", "Q", "H"] as Level[]).map((lv) => (
                  <button
                    key={lv}
                    type="button"
                    onClick={() => setLevel(lv)}
                    aria-pressed={level === lv}
                    className={`rounded-xl border px-3 py-2 text-sm shadow-sm dark:border-slate-800
                      ${level === lv
                        ? "bg-indigo-600 text-white"
                        : "bg-white hover:bg-slate-50 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"}`}
                    title={ecLabels[lv]}
                  >
                    {lv}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500">
                復旧率が高いほど汚れや欠損に強い反面、情報量が増えます。
              </p>
            </fieldset>

            {/* マージン（Quiet Zone） */}
            <label className="space-y-1 block">
              <span className="text-sm font-medium">マージン（Quiet Zone）</span>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={8}
                  value={margin}
                  onChange={(e) => setMargin(Number(e.target.value))}
                  className="w-full"
                  aria-label="マージン（スライダー）"
                />
                <input
                  type="number"
                  min={0}
                  max={8}
                  value={margin}
                  onChange={(e) => setMargin(Math.min(8, Math.max(0, Number(e.target.value) || 0)))}
                  className="w-20 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm
                             focus:outline-none focus:ring-4 focus:ring-indigo-100
                             dark:bg-slate-950 dark:border-slate-800"
                  aria-label="マージン（数値入力）"
                />
              </div>
            </label>

            {/* 色 */}
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1">
                <span className="text-sm font-medium">前景色</span>
                <input
                  type="color"
                  value={fg}
                  onChange={(e) => setFg(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white p-1 shadow-sm
                             dark:bg-slate-950 dark:border-slate-800"
                  aria-label="前景色"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium">背景色</span>
                <input
                  type="color"
                  value={bg}
                  onChange={(e) => setBg(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white p-1 shadow-sm
                             dark:bg-slate-950 dark:border-slate-800"
                  aria-label="背景色"
                />
              </label>
            </div>

            {error && (
              <p className="text-sm text-rose-600 dark:text-rose-400" role="alert">
                {error}
              </p>
            )}

            <p className="text-xs text-slate-500">
              個人情報や機密情報の入力はお控えください。生成は端末内で完結します（送信なし）。
            </p>
          </div>
        </div>

        {/* プレビュー */}
        <div className="rounded-2xl border bg-white/70 backdrop-blur p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-4">
            <div className="aspect-square w-full rounded-xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-950 grid place-items-center">
              {text ? (
                <canvas
                  ref={canvasRef}
                  width={size}
                  height={size}
                  className="h-auto w-full max-w-[min(90%,560px)]"
                  aria-label="QRコード プレビュー"
                />
              ) : (
                <p className="text-slate-500 text-sm">入力するとここにQRコードが表示されます</p>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleCopyPng}
                disabled={!text}
                className="inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium shadow-sm
                           bg-indigo-600 text-white hover:bg-indigo-500 active:translate-y-[1px]
                           disabled:opacity-50 disabled:cursor-not-allowed"
                aria-live="polite"
              >
                {copied === "png" ? "PNGをコピーしました" : "PNGをコピー"}
              </button>
              <button
                onClick={handleDownloadPng}
                disabled={!text}
                className="inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium shadow-sm
                           bg-white text-slate-900 hover:bg-slate-50 active:translate-y-[1px]
                           dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900
                           border-slate-300 dark:border-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                PNGをダウンロード
              </button>

              <button
                onClick={handleCopySvg}
                disabled={!svgString}
                className="inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium shadow-sm
                           bg-white text-slate-900 hover:bg-slate-50 active:translate-y-[1px]
                           dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900
                           border-slate-300 dark:border-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-live="polite"
              >
                {copied === "svg" ? "SVGをコピーしました" : "SVGをコピー"}
              </button>
              <button
                onClick={handleDownloadSvg}
                disabled={!svgString}
                className="inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium shadow-sm
                           bg-white text-slate-900 hover:bg-slate-50 active:translate-y-[1px]
                           dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900
                           border-slate-300 dark:border-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                SVGをダウンロード
              </button>
            </div>

            <div className="text-xs text-slate-500">
              <p>ヒント：高解像度が必要なら SVG 保存が便利です（劣化しません）。</p>
              <p>ショートカット：Ctrl/Cmd + Enter で PNG をコピー</p>
            </div>
          </div>
        </div>
      </section>

      <p className="mt-8 text-center text-xs text-slate-500">
        ※ サーバー送信なし／ブラウザ内生成
      </p>
    </main>
  );
}
