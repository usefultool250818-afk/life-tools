"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";

/**
 * 老後資産シミュレーター（日本版）
 * - サイト共通のUI/UX（カード/統計/表/グラフ/操作ボタン/トースト）をキャッシュフロープランナーと揃えています
 * - 左：入力（公的年金を「国民年金」「厚生年金」で分離）/ 右：レポート（差額・必要資産・FIRE年齢・枯渇年齢・推移グラフ）
 * - 状態は URL（?q=base64）と localStorage に保存／共有可能
 */

export default function OldAgeSimulator() {
  const thisYear = new Date().getFullYear();

  // -------------------- 型 --------------------
  type Inputs = {
    // 年齢・期間
    age: number; // 現在の年齢
    retireAge: number; // 退職年齢
    lifeAge: number; // 寿命想定
    // 収支（手取り想定）
    kokuminMonthly: number; // 国民年金（老齢基礎）月額
    kouseiMonthly: number; // 厚生年金（報酬比例）月額
    spendRetireMonthly: number; // 退職後の生活費（月）
    // 資産・積立
    assetsNow: number; // 現在の資産（円）
    monthlySave: number; // 月の積立（円）
    severance: number; // 退職金（円）
    // マーケット前提（名目→実質に変換）
    nominalReturn: number; // 期待利回り（年%）
    inflation: number; // インフレ率（年%）
  };

  type Row = {
    year: number;
    age: number;
    assets: number; // 円
  };

  // -------------------- 初期値 --------------------
  const DEFAULT: Inputs = {
    age: 32,
    retireAge: 65,
    lifeAge: 95,
    kokuminMonthly: 69_308, // 2025年度 満額（税引前）を目安に（UIでは手取り想定と注記）
    kouseiMonthly: 90_000, // 目安（個人差大）
    spendRetireMonthly: 250_000,
    assetsNow: 5_000_000,
    monthlySave: 50_000,
    severance: 0,
    nominalReturn: 4.0,
    inflation: 1.5,
  };

  // -------------------- 状態（URL & LS 復元） --------------------
  const [inp, setInp] = useState<Inputs>(() => {
    if (typeof window !== "undefined") {
      const q = new URLSearchParams(window.location.search).get("q");
      if (q) {
        try {
          return JSON.parse(b64d(q)) as Inputs;
        } catch {}
      }
      const saved = window.localStorage.getItem("oldage_inputs");
      if (saved) {
        try {
          return JSON.parse(saved) as Inputs;
        } catch {}
      }
    }
    return DEFAULT;
  });

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  // URL & LS 同期
  useEffect(() => {
    if (!hydrated) return;
    const q = b64e(JSON.stringify(inp));
    const params = new URLSearchParams(window.location.search);
    params.set("q", q);
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
    saveJSON("oldage_inputs", inp);
  }, [inp, hydrated]);

  // UI: 入力 / レポート 切替（モバイル最適化）
  const [viewMode, setViewMode] = useState<"edit" | "report">("report");
  const mobileHidden = (section: "edit" | "report") => (viewMode === section ? "" : "hidden lg:block");

  // トースト
  const [toast, setToast] = useState<string | null>(null);
  async function copyShareUrl() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast("URLをコピーしました");
    } catch {
      showToast("コピーできませんでした");
    }
  }
  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 1200);
  }

  // -------------------- 計算 --------------------
  const rReal = useMemo(() => {
    const r = (1 + inp.nominalReturn / 100) / (1 + inp.inflation / 100) - 1;
    return r;
  }, [inp.nominalReturn, inp.inflation]);

  const result = useMemo(() => {
    const startYear = thisYear;
    const monthlyPension = Math.max(0, inp.kokuminMonthly) + Math.max(0, inp.kouseiMonthly);
    const monthlyGap = inp.spendRetireMonthly - monthlyPension; // <0 なら不足なし
    const annualCF = Math.max(0, monthlyGap * 12); // 不足が無ければ0
    const N = Math.max(0, inp.lifeAge - inp.retireAge);
    const r = rReal;
    const needAtRetire =
      annualCF === 0
        ? 0
        : Math.abs(r) > 1e-9
        ? (annualCF * (1 - Math.pow(1 + r, -N))) / r
        : annualCF * N;
    const needWithMargin = Math.round(needAtRetire * 1.1);

    // 年次シミュレーション
    const rows: Row[] = [];
    let assets = inp.assetsNow;
    let fireAge: number | null = null;
    let exhaustAge: number | null = null;

    for (let age = inp.age; age < inp.retireAge; age++) {
      const y = startYear + (age - inp.age);
      rows.push({ year: y, age, assets: Math.round(assets) });
      if (!fireAge && assets >= needWithMargin) fireAge = age;
      assets = Math.round(assets * (1 + r) + inp.monthlySave * 12);
    }

    // 退職年：退職金を加算して行として保存
    assets += inp.severance;
    rows.push({
      year: startYear + (inp.retireAge - inp.age),
      age: inp.retireAge,
      assets: Math.round(assets),
    });

    // 取り崩し期
    const annualPension = monthlyPension * 12;
    const annualSpend = inp.spendRetireMonthly * 12;

    for (let age = inp.retireAge + 1; age <= inp.lifeAge; age++) {
      const y = startYear + (age - inp.age);
      assets = Math.round(assets * (1 + r) + annualPension - annualSpend);
      rows.push({ year: y, age, assets });
      if (!exhaustAge && assets < 0) exhaustAge = age;
    }

    return {
      startYear,
      rows,
      monthlyPension,
      monthlyGap,
      annualCF,
      needAtRetire,
      needWithMargin,
      fireAge,
      exhaustAge,
    };
  }, [inp, rReal, thisYear]);

  // CSV（万円）
  const downloadCSV = () => {
    const headers = ["西暦", "年齢", "資産残高［万円］", "注記"];
    const body = result.rows.map((r) => {
      let note = "";
      if (r.age === inp.retireAge) note = "退職（退職金反映）";
      return [r.year, r.age, yenToMan(r.assets), note].join(",");
    });
    const blob = new Blob(["\uFEFF" + [headers.join(","), ...body].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `oldage_${result.startYear}_${inp.age}-${inp.lifeAge}_man.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetAll = () => {
    window.localStorage.removeItem("oldage_inputs");
    setInp(DEFAULT);
    const params = new URLSearchParams(window.location.search);
    params.delete("q");
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${params.toString() ? "?" + params : ""}`
    );
    showToast("初期化しました");
  };

  // -------------------- UI --------------------
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* ページ内ヘッダー（サイト固定ヘッダーとは別に、各ツール統一の操作バー） */}
      <header className="sticky top-[var(--site-header-h)] z-40 bg-white/80 backdrop-blur border-b print:hidden">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-bold">老後資産シミュレーター</h1>

          <div className="flex items-center gap-2">
            {/* 入力 / レポート 切替（モバイル最適化） */}
            <div className="flex rounded-full border p-1 bg-white">
              <button
                onClick={() => setViewMode("edit")}
                className={
                  "px-3 py-1.5 rounded-full text-sm " +
                  (viewMode === "edit" ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100")
                }
                aria-pressed={viewMode === "edit"}
              >
                入力
              </button>
              <button
                onClick={() => setViewMode("report")}
                className={
                  "px-3 py-1.5 rounded-full text-sm " +
                  (viewMode === "report" ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100")
                }
                aria-pressed={viewMode === "report"}
              >
                レポート
              </button>
            </div>

            <button
              onClick={copyShareUrl}
              className="px-3 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm hover:bg-gray-200"
            >
              URLコピー
            </button>
            <button
              onClick={() => window.print()}
              className="px-3 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm hover:bg-gray-200"
            >
              印刷
            </button>
            <button
              onClick={downloadCSV}
              className="px-3 py-2 rounded-xl bg-gray-900 text-white text-sm hover:opacity-90"
            >
              CSV出力
            </button>
            <button
              onClick={resetAll}
              className="px-3 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm hover:bg-gray-200"
            >
              リセット
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 grid lg:grid-cols-3 gap-6">
        {/* 左：入力 */}
        <section className={`lg:col-span-1 space-y-6 ${mobileHidden("edit")}`}>
          <div className="hidden lg:block text-xs font-medium text-gray-500">入力（編集）</div>

          <Card title="公的年金（手取り想定）">
            <div className="space-y-4">
              <LabeledInput
                label="国民年金（老齢基礎）・月額"
                type="number"
                value={inp.kokuminMonthly}
                onChange={(v) => setInp({ ...inp, kokuminMonthly: clampNonNeg(Number(v)) })}
                suffix="円/月"
              />
              <p className="text-xs text-gray-500">
                目安：40年納付の満額は2025年度で<strong>69,308円/月（税引前）</strong>。実際の手取りは税・社会保険で変わります。{" "}
                <a
                  className="underline"
                  href="https://www.nenkin.go.jp/tokusetsu/nenkingakutou_kaitei.html"
                  target="_blank"
                  rel="noreferrer"
                >
                  公式：年金額
                </a>
              </p>

              <LabeledInput
                label="厚生年金（報酬比例）・月額"
                type="number"
                value={inp.kouseiMonthly}
                onChange={(v) => setInp({ ...inp, kouseiMonthly: clampNonNeg(Number(v)) })}
                suffix="円/月"
              />
              <p className="text-xs text-gray-500">
                収入と加入月数で決まります。見込額は
                <a
                  className="underline ml-1"
                  href="https://www.nenkin.go.jp/n_net/introduction/estimatedamount.html"
                  target="_blank"
                  rel="noreferrer"
                >
                  ねんきんネット
                </a>{" "}
                や{" "}
                <a className="underline" href="https://nenkin-shisan.mhlw.go.jp/" target="_blank" rel="noreferrer">
                  公的年金シミュレーター
                </a>
                で確認できます。
              </p>
            </div>
          </Card>

          <Card title="老後の生活費（手取り）">
            <IntInput
              label="退職後の生活費（月）"
              value={inp.spendRetireMonthly}
              onChange={(yen) => setInp({ ...inp, spendRetireMonthly: clampNonNeg(yen) })}
              scale={1}
              suffix="円/月"
            />
            <p className="text-xs text-gray-500 mt-2">
              住居・食費・光熱・通信・保険などの合計。旅行・車・リフォームなどは将来「特別支出」機能（次版）で追加予定です。
            </p>
          </Card>

          <Card title="年齢・期間">
            <div className="grid grid-cols-3 gap-3">
              <LabeledInput
                label="現在の年齢"
                type="number"
                value={inp.age}
                onChange={(v) => setInp({ ...inp, age: clampRange(Number(v), 18, 100) })}
                suffix="歳"
              />
              <LabeledInput
                label="退職年齢"
                type="number"
                value={inp.retireAge}
                onChange={(v) =>
                  setInp({
                    ...inp,
                    retireAge: clampRange(Number(v), inp.age, 100),
                  })
                }
                suffix="歳"
              />
              <LabeledInput
                label="寿命の想定"
                type="number"
                value={inp.lifeAge}
                onChange={(v) =>
                  setInp({
                    ...inp,
                    lifeAge: clampRange(Number(v), Math.max(inp.retireAge, inp.age), 110),
                  })
                }
                suffix="歳"
              />
            </div>
          </Card>

          <Card title="資産・積立">
            <div className="grid grid-cols-2 gap-3">
              <IntInput
                label="現在の資産（円）"
                value={inp.assetsNow}
                onChange={(yen) => setInp({ ...inp, assetsNow: clampNonNeg(yen) })}
                scale={1}
                suffix="円"
              />
              <IntInput
                label="月の積立（円）"
                value={inp.monthlySave}
                onChange={(yen) => setInp({ ...inp, monthlySave: clampNonNeg(yen) })}
                scale={1}
                suffix="円/月"
              />
              <IntInput
                label="退職金（円）"
                value={inp.severance}
                onChange={(yen) => setInp({ ...inp, severance: clampNonNeg(yen) })}
                scale={1}
                suffix="円"
              />
            </div>
          </Card>

          <Card title="市場・物価（名目→実質に換算）">
            <div className="grid grid-cols-2 gap-3">
              <LabeledInput
                label="期待利回り（名目）"
                type="number"
                step={0.1}
                value={inp.nominalReturn}
                onChange={(v) => setInp({ ...inp, nominalReturn: Number(v) || 0 })}
                suffix="%/年"
              />
              <LabeledInput
                label="インフレ率"
                type="number"
                step={0.1}
                value={inp.inflation}
                onChange={(v) => setInp({ ...inp, inflation: Number(v) || 0 })}
                suffix="%/年"
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              実質利回り＝(1+名目利回り)/(1+インフレ率) − 1。物価上昇を考慮した「実質の増え方」です。
            </p>
          </Card>
        </section>

        {/* 右：レポート */}
        <section className={`lg:col-span-2 space-y-6 ${mobileHidden("report")}`}>
          <div className="hidden lg:block text-xs font-medium text-gray-500">レポート（閲覧）</div>

          <Card title="サマリー">
            <div className="grid sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <Stat label="年金合計（月）" value={`¥${fmtYen(result.monthlyPension)}`} />
              <Stat
                label="毎月の不足額"
                value={result.monthlyGap > 0 ? `¥${fmtYen(result.monthlyGap)}` : "不足なし"}
              />
              <Stat
                label="年間不足額"
                value={result.monthlyGap > 0 ? `¥${fmtYen(result.monthlyGap * 12)}` : "0円"}
              />
              <Stat label="退職時必要資産（概算＋余裕10%）" value={`¥${fmtYen(result.needWithMargin)}`} />
              <Stat label="実質利回り" value={`${(rReal * 100).toFixed(2)}%`} />
              <Stat label="FIRE可能年齢" value={result.fireAge ? `${result.fireAge}歳` : "未達"} />
            </div>
            <div className="grid sm:grid-cols-2 gap-3 mt-3">
              <Stat
                label="資産枯渇年齢"
                value={
                  result.exhaustAge ? (
                    <span className="text-red-600">{result.exhaustAge}歳</span>
                  ) : (
                    "枯渇なし（寿命まで維持）"
                  )
                }
              />
              <Stat label="退職年齢" value={`${inp.retireAge}歳`} />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              退職後、<strong>年金で不足する分（年間CF）</strong>を運用益で補いながら取り崩すと仮定して必要資産を概算しています。
            </p>
          </Card>

          <Card title="資産推移（年次・実質ベース）">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={result.rows} margin={{ top: 10, right: 16, bottom: 8, left: 72 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis
                    width={64}
                    tickMargin={8}
                    tickFormatter={(v) => `${(v / 10_000).toLocaleString("ja-JP")}万円`}
                  />
                  <Tooltip
                    formatter={(val: number | string) =>
                      `${(Number(val) / 10_000).toLocaleString("ja-JP")}万円`
                    }
                    labelFormatter={(y: number | string) => `${y}年（${Number(y) - result.startYear + inp.age}歳）`}
                  />
                  <Legend wrapperStyle={{ paddingTop: 8 }} />
                  <ReferenceLine
                    x={result.startYear + (inp.retireAge - inp.age)}
                    stroke="#6b7280"
                    strokeDasharray="6 4"
                    label={{ value: "退職", position: "insideTopRight", fill: "#6b7280", fontSize: 12 }}
                  />
                  {result.needWithMargin > 0 && (
                    <ReferenceLine
                      y={result.needWithMargin}
                      stroke="#0ea5e9"
                      strokeDasharray="6 4"
                      label={{
                        value: "退職時必要資産（概算＋余裕）",
                        position: "left",
                        fill: "#0ea5e9",
                        fontSize: 12,
                      }}
                    />
                  )}
                  <Line type="monotone" dataKey="assets" name="資産残高" dot={false} stroke="#16a34a" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              緑の線が上向き・横ばいで推移し、退職ライン以降も<strong>必要資産ライン</strong>を大きく下回らなければ、寿命まで維持の可能性が高まります。
            </p>
          </Card>

          <Card title="詳細テーブル（年次）">
            <div className="overflow-auto rounded-xl border bg-white">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <Th>西暦</Th>
                    <Th>年齢</Th>
                    <Th className="text-right">資産残高（万円）</Th>
                    <Th className="text-right">注記</Th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((r) => (
                    <tr key={r.year} className="border-t hover:bg-gray-50">
                      <Td>{r.year}</Td>
                      <Td>{r.age}</Td>
                      <Td className="text-right">{manLabel(r.assets)}</Td>
                      <Td className="text-right">
                        {r.age === inp.retireAge ? "退職（退職金反映）" : ""}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="使い方・考え方（簡易版）">
            <ol className="list-decimal pl-5 space-y-1 text-sm text-gray-700">
              <li>
                国民年金（老齢基礎）と厚生年金（報酬比例）を<strong>手取り想定</strong>で入力します（公表値は税引前）。
              </li>
              <li>退職後の生活費（月）を入れて<strong>不足額</strong>を確認します。</li>
              <li>退職年齢・寿命、現在の資産・積立、期待利回り・インフレを調整します。</li>
              <li>
                「退職時に必要な資産（概算＋余裕10%）」は、<code>不足額（年）</code>を実質利回りで割り引いた値です。
              </li>
              <li>CSVを出力して記録したり、URLをコピーして条件を共有できます。</li>
            </ol>
            <p className="text-xs text-gray-500 mt-2">
              ※ 本ツールは概算モデルです。年金・税・社会保険・投資リスクは条件で大きく変動します。実際の判断は公的情報や専門家の助言をご確認ください。
            </p>
          </Card>
        </section>
      </main>

      {/* トースト */}
      {toast && (
        <div className="fixed bottom-4 right-4 px-3 py-2 rounded-lg bg-gray-900 text-white text-sm shadow">
          {toast}
        </div>
      )}
    </div>
  );
}

/* ==================== 共通UI小物（他ツールと統一） ==================== */
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-white p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`text-left p-2 font-medium text-gray-600 ${className}`}>{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`p-2 ${className}`}>{children}</td>;
}

/** ラベル＋インプット（suffix 付き） */
function LabeledInput({
  label,
  value,
  onChange,
  type = "text",
  step,
  suffix,
  className = "",
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  step?: number;
  suffix?: string;
  className?: string;
}) {
  const pr = suffix ? "pr-12" : "";
  return (
    <label className={`text-sm ${className}`}>
      <div className="text-gray-600 mb-1">{label}</div>
      <div className="relative min-w-0">
        <input
          className={`w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300 ${pr}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          type={type}
          step={step}
          inputMode={type === "number" ? "decimal" : undefined}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
            {suffix}
          </span>
        )}
      </div>
    </label>
  );
}

/** 整数入力（signed可）: 表示/入力は value(円)/scale を扱う */
function IntInput({
  label,
  value,
  onChange,
  signed = false,
  className = "",
  suffix,
  scale = 1,
}: {
  label: string;
  value: number; // 内部は円
  onChange: (yen: number) => void; // 返却も円
  signed?: boolean;
  className?: string;
  suffix?: string;
  scale?: number; // 表示スケール（円→表示値 = 円/scale）
}) {
  const [focused, setFocused] = useState(false);
  const [inner, setInner] = useState<string>("");

  const displayNumber = Math.trunc(value / scale);
  const grouped = useMemo(() => groupInt(displayNumber), [displayNumber]);

  const pr = suffix ? "pr-12" : "";

  return (
    <label className={`text-sm ${className}`}>
      <div className="text-gray-600 mb-1">{label}</div>
      <div className="relative min-w-0">
        <input
          className={`w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300 ${pr}`}
          inputMode="numeric"
          type="text"
          value={focused ? inner : grouped}
          onFocus={() => {
            setFocused(true);
            setInner(String(displayNumber));
          }}
          onChange={(e) => {
            const raw = e.target.value;
            const cleaned = signed ? cleanSignedInt(raw) : cleanInt(raw);
            setInner(cleaned);
            const scaled = cleaned === "" || cleaned === "-" ? 0 : Number(cleaned);
            onChange(scaled * scale); // 表示値 → 円
          }}
          onBlur={() => {
            if (inner === "" || inner === "-") onChange(0);
            setFocused(false);
          }}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
            {suffix}
          </span>
        )}
      </div>
    </label>
  );
}

/* ==================== ユーティリティ ==================== */
function fmtYen(n: number): string {
  return Math.round(n).toLocaleString("ja-JP");
}
function yenToMan(yen: number): number {
  return Math.round(yen / 10_000);
}
function manLabel(yen: number): string {
  return `${yenToMan(yen).toLocaleString("ja-JP")}万円`;
}
function groupInt(n: number): string {
  return new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 0 }).format(Math.trunc(n));
}
function cleanInt(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  return digits.replace(/^0+(?=\d)/, "");
}
function cleanSignedInt(raw: string): string {
  let s = raw.replace(/[^\d-]/g, "");
  s = s.replace(/(?!^)-/g, "");
  s = s.replace(/^(-?)0+(?=\d)/, "$1");
  return s;
}
function saveJSON<T>(key: string, value: T) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}
function clampNonNeg(n: number) {
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}
function clampRange(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.floor(n)));
}
/** Base64 (UTF-8対応) */
function b64e(s: string) {
  return btoa(encodeURIComponent(s));
}
function b64d(s: string) {
  return decodeURIComponent(atob(s));
}
