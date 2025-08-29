"use client";

import React, { useMemo, useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";

export default function CashflowPlanner() {
  const thisYear = new Date().getFullYear();

  // -------------------- 型 --------------------
  type Member = { id: string; name: string; birthYear: number; baseIncome: number }; // 円
  type OneOff = { id: string; year: number; label: string; amount: number }; // 円（+収入/-支出）
  type Expense = { key: string; label: string; amount: number }; // 円
  type TableRow = {
    year: number;
    ages: string;
    income: number;
    expense: number;
    net: number;
    savings: number;
  };

  // -------------------- 初期値（SSRと一致） --------------------
  const defaultMembers: Member[] = [
    { id: "m1", name: "本人", birthYear: thisYear - 32, baseIncome: 6_000_000 },
  ];
  const defaultExpenses: Expense[] = [
    { key: "basic", label: "基本生活費", amount: 2_400_000 },
    { key: "housing", label: "住居関連費", amount: 1_800_000 },
    { key: "car", label: "車両費", amount: 300_000 },
    { key: "education", label: "教育費", amount: 0 },
    { key: "insurance", label: "保険料", amount: 240_000 },
    { key: "other", label: "その他の支出", amount: 300_000 },
  ];
  const defaultOneOffs: OneOff[] = [
    { id: "o1", year: thisYear + 3, label: "引越し費用", amount: -300_000 },
  ];

  // -------------------- State --------------------
  const [startYear, setStartYear] = useState(thisYear);
  const [years, setYears] = useState(20);
  const [members, setMembers] = useState<Member[]>(defaultMembers);
  const [expenses, setExpenses] = useState<Expense[]>(defaultExpenses);
  const [oneOffs, setOneOffs] = useState<OneOff[]>(defaultOneOffs);
  const [assumptions, setAssumptions] = useState({
    inflation: 0.02,
    salaryGrowth: 0.01,
    returnRate: 0.02,
    initialSavings: 2_000_000, // 円
    takeHomeRate: 0.8,         // ★ 追加：手取り率（0〜1）
  });

  // 入力/レポート モード
  const [viewMode, setViewMode] = useState<"edit" | "report">("report");
  const mobileHidden = (section: "edit" | "report") =>
    viewMode === section ? "" : "hidden lg:block";

  // トースト（URLコピーなどのフィードバック）
  const [toast, setToast] = useState<string | null>(null);
  async function copyShareUrl() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setToast("URLをコピーしました");
      setTimeout(() => setToast(null), 1200);
    } catch {
      setToast("コピーできませんでした");
      setTimeout(() => setToast(null), 1200);
    }
  }

  // 初回マウントで URL / localStorage 読み込み
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);

    const load = <T,>(lsKey: string, qKey: "m" | "e" | "o", fb: T): T => {
      if (q.get(qKey)) {
        try {
          return JSON.parse(b64d(String(q.get(qKey)))) as T;
        } catch {}
      }
      const raw = window.localStorage.getItem(lsKey);
      return raw ? (JSON.parse(raw) as T) : fb;
    };

    setMembers(load<Member[]>("cf_members", "m", defaultMembers));
    setExpenses(load<Expense[]>("cf_expenses", "e", defaultExpenses));
    setOneOffs(load<OneOff[]>("cf_oneoffs", "o", defaultOneOffs));

    const y = q.get("y");
    const n = q.get("n");
    const a = q.get("a");
    if (y) setStartYear(Number(y));
    if (n) setYears(Math.max(1, Number(n)));
    if (a) {
      try {
        setAssumptions(JSON.parse(b64d(a)));
      } catch {}
    }

    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // URLを常に最新化（クライアントのみ）
  useEffect(() => {
    if (!hydrated) return;
    const params = new URLSearchParams();
    params.set("y", String(startYear));
    params.set("n", String(years));
    params.set("a", b64e(JSON.stringify(assumptions)));
    params.set("m", b64e(JSON.stringify(members)));
    params.set("e", b64e(JSON.stringify(expenses)));
    params.set("o", b64e(JSON.stringify(oneOffs)));
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}?${params.toString()}`
    );
  }, [startYear, years, assumptions, members, expenses, oneOffs, hydrated]);

  // localStorage 保存（初期ロード後のみ）
  useEffect(() => {
    if (hydrated) saveJSON("cf_members", members);
  }, [members, hydrated]);
  useEffect(() => {
    if (hydrated) saveJSON("cf_expenses", expenses);
  }, [expenses, hydrated]);
  useEffect(() => {
    if (hydrated) saveJSON("cf_oneoffs", oneOffs);
  }, [oneOffs, hydrated]);

  // -------------------- 計算（内部は円のまま） --------------------
  const table = useMemo<TableRow[]>(() => {
    const rows: TableRow[] = [];
    let savings = assumptions.initialSavings; // 円

    for (let i = 0; i < years; i++) {
      const year = startYear + i;
      const ages = members.map((m) => year - m.birthYear);

      const totalIncome = members.reduce((sum, m) => {
        const t = year - startYear;
        const gross = m.baseIncome * Math.pow(1 + assumptions.salaryGrowth, t);
        const net   = gross * (assumptions.takeHomeRate ?? 1); // ★ 手取り率を乗算
        return sum + net;
      }, 0);

      const totalFixedOut = expenses.reduce((sum, e) => {
        const t = year - startYear;
        return sum + e.amount * Math.pow(1 + assumptions.inflation, t);
      }, 0);

      const oneOffIncome = oneOffs
        .filter((o) => o.year === year && o.amount > 0)
        .reduce((s, o) => s + o.amount, 0);
      const oneOffOut = oneOffs
        .filter((o) => o.year === year && o.amount < 0)
        .reduce((s, o) => s + Math.abs(o.amount), 0);

      const incomeA = totalIncome + oneOffIncome;
      const outB = totalFixedOut + oneOffOut;
      const net = incomeA - outB;

      const interest = savings * assumptions.returnRate;
      savings = savings + interest + net;

      rows.push({
        year,
        ages: ages.join("/"),
        income: Math.round(incomeA), // 円
        expense: Math.round(outB), // 円
        net: Math.round(net), // 円
        savings: Math.round(savings), // 円
      });
    }
    return rows;
  }, [members, expenses, oneOffs, assumptions, years, startYear]);

  // CSV（万円）
  const downloadCSV = () => {
    const headers = [
      "年",
      "年齢( / 区切り)",
      "収入合計(A)［万円］",
      "支出合計(B)［万円］",
      "年間収支(A-B)［万円］",
      "貯蓄残高［万円］",
    ];
    const body = table.map((r) =>
      [
        r.year,
        r.ages,
        yenToMan(r.income),
        yenToMan(r.expense),
        yenToMan(r.net),
        yenToMan(r.savings),
      ].join(",")
    );
    const blob = new Blob(
      ["\uFEFF" + [headers.join(","), ...body].join("\n")],
      { type: "text/csv;charset=utf-8;" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cashflow_${startYear}_${years}y_man.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetAll = () => {
    window.localStorage.removeItem("cf_members");
    window.localStorage.removeItem("cf_expenses");
    window.localStorage.removeItem("cf_oneoffs");
    setMembers(defaultMembers);
    setExpenses(defaultExpenses);
    setOneOffs(defaultOneOffs);
    setAssumptions({
      inflation: 0.02,
      salaryGrowth: 0.01,
      returnRate: 0.02,
      initialSavings: 2_000_000,
      takeHomeRate: 0.8, 
    });
    setStartYear(thisYear);
    setYears(20);
    window.history.replaceState(null, "", window.location.pathname); // クエリ消去
  };

  // -------------------- UI --------------------
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b print:hidden">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-bold">家計キャッシュフロープランナー</h1>

          <div className="flex items-center gap-2">
            {/* 入力 / レポート 切替 */}
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

            <button onClick={copyShareUrl} className="px-3 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm hover:bg-gray-200">
              URLコピー
            </button>
            <button onClick={() => window.print()} className="px-3 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm hover:bg-gray-200">
              印刷
            </button>
            <button onClick={downloadCSV} className="px-3 py-2 rounded-xl bg-gray-900 text-white text-sm hover:opacity-90">
              CSV出力
            </button>
            <button onClick={resetAll} className="px-3 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm hover:bg-gray-200">
              リセット
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 grid lg:grid-cols-3 gap-6">
        {/* 左カラム：入力 */}
        <section className={`lg:col-span-1 space-y-6 ${mobileHidden("edit")}`}>
          <div className="hidden lg:block text-xs font-medium text-gray-500">入力（編集）</div>

          <Card title="期間・前提条件">
            <div className="grid grid-cols-2 gap-3">
              <LabeledInput
                label="開始年"
                type="number"
                value={startYear}
                onChange={(v) => setStartYear(Number(v))}
              />
              <LabeledInput
                label="年数"
                type="number"
                value={years}
                onChange={(v) => setYears(Math.max(1, Number(v)))}
              />

              {/* 初期貯蓄（万円表示/入力） */}
              <IntInput
                label="初期貯蓄"
                value={assumptions.initialSavings}
                onChange={(yen) =>
                  setAssumptions({ ...assumptions, initialSavings: yen })
                }
                scale={10_000}
                suffix="万円"
              />

              {/* 小数系（そのまま） */}
              <LabeledInput
                label="年利(貯蓄)"
                type="number"
                step={0.01}
                value={assumptions.returnRate}
                onChange={(v) =>
                  setAssumptions({
                    ...assumptions,
                    returnRate: Number(v),
                  })
                }
                suffix="/年"
              />
              <LabeledInput
                label="物価上昇率"
                type="number"
                step={0.01}
                value={assumptions.inflation}
                onChange={(v) =>
                  setAssumptions({
                    ...assumptions,
                    inflation: Number(v),
                  })
                }
                suffix="/年"
              />
              <LabeledInput
                label="給与上昇率"
                type="number"
                step={0.01}
                value={assumptions.salaryGrowth}
                onChange={(v) =>
                  setAssumptions({
                    ...assumptions,
                    salaryGrowth: Number(v),
                  })
                }
                suffix="/年"
              />
              <LabeledInput
                label="手取り率（収入）"
                type="number"
                step={0.01}
                value={assumptions.takeHomeRate}
                onChange={(v) =>
                  setAssumptions({
                    ...assumptions,
                    takeHomeRate: clamp01(Number(v)), // 0〜1に丸め
                  })
                }
                suffix="×"
              />
            </div>
        
          </Card>

          <Card title="世帯メンバー">
            <div className="space-y-3">
              {members.map((m) => (
                <div key={m.id} className="p-3 rounded-xl border bg-white">
                  <div className="grid grid-cols-2 gap-3">
                    <LabeledInput
                      label="氏名"
                      value={m.name}
                      onChange={(v) => updateMember(m.id, { name: v })}
                    />
                    <LabeledInput
                      label="生年"
                      type="number"
                      value={m.birthYear}
                      onChange={(v) =>
                        updateMember(m.id, { birthYear: Number(v) })
                      }
                    />

                    {/* ベース年収（万円） */}
                    <IntInput
                      label="ベース年収"
                      value={m.baseIncome}
                      onChange={(yen) =>
                        updateMember(m.id, { baseIncome: yen })
                      }
                      scale={10_000}
                      suffix="万円"
                    />

                    <div className="flex items-end justify-end">
                      {members.length > 1 && (
                        <button
                          onClick={() => removeMember(m.id)}
                          className="px-3 py-2 text-sm rounded-lg bg-red-50 text-red-700 hover:bg-red-100"
                        >
                          削除
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {startYear}年時点年齢：{startYear - m.birthYear}歳
                  </p>
                </div>
              ))}
              <button
                onClick={addMember}
                className="w-full px-3 py-2 rounded-xl bg-gray-900 text-white text-sm"
              >
                ＋ メンバー追加
              </button>
            </div>
          </Card>

          <Card title="定常支出（年額）">
            <div className="space-y-3">
              {expenses.map((e) => (
                <div key={e.key} className="grid grid-cols-2 gap-3">
                  <div className="text-sm text-gray-700 flex items-center">
                    {e.label}
                  </div>
                  {/* 金額（万円） */}
                  <IntInput
                    label="金額"
                    value={e.amount}
                    onChange={(yen) => updateExpense(e.key, yen)}
                    scale={10_000}
                    suffix="万円"
                  />
                </div>
              ))}
            </div>
          </Card>

          <Card title="一時的な収支">
            <div className="space-y-4">
              {oneOffs.map((o) => (
                <div
                  key={o.id}
                  className="p-4 rounded-xl border bg-white grid grid-cols-1 md:grid-cols-12 gap-x-3 gap-y-2 items-end"
                >
                  {/* 内容：広め（5/12） */}
                  <LabeledInput
                    className="md:col-span-5"
                    label="内容"
                    value={o.label}
                    onChange={(v) => updateOneOff(o.id, { label: v })}
                  />

                  {/* 発生年：やや広め（4/12） */}
                  <LabeledInput
                    className="md:col-span-4"
                    label="発生年"
                    type="number"
                    value={o.year}
                    onChange={(v) => updateOneOff(o.id, { year: Number(v) })}
                  />

                  {/* 金額：3/12（単位は右隣のセルに表示するため suffix は使わない） */}
                  <IntInput
                    className="md:col-span-3"
                    label="金額(＋収入/−支出)"
                    value={o.amount}
                    signed
                    onChange={(yen) => updateOneOff(o.id, { amount: yen })}
                    scale={10_000}
                  />

                  {/* 単位（万円）を別セルに分離。小画面では次行に出る */}
                  <div className="md:col-span-1 md:col-start-12 md:row-start-1 text-xs text-gray-500 whitespace-nowrap md:text-right">
                    万円
                  </div>

                  {/* 削除ボタンは最下段で右寄せ */}
                  <div className="md:col-span-12 flex justify-end">
                    <button
                      onClick={() => removeOneOff(o.id)}
                      className="px-3 py-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 text-sm"
                    >
                      削除
                    </button>
                  </div>
                </div>
              ))}
              <button
                className="w-full px-3 py-2 rounded-xl bg-gray-900 text-white text-sm"
                onClick={addOneOff}
              >
                ＋ 一時的な収支を追加
              </button>
            </div>
          </Card>
        </section>

        {/* 右カラム：結果 */}
        <section className={`lg:col-span-2 space-y-6 ${mobileHidden("report")}`}>
          <div className="hidden lg:block text-xs font-medium text-gray-500">レポート（閲覧）</div>

          <Card title="サマリー">
            <div className="grid sm:grid-cols-4 gap-3">
              <Stat
                label="今年の収入(A)（万円）"
                value={manLabel(table[0]?.income ?? 0)}
              />
              <Stat
                label="今年の支出(B)（万円）"
                value={manLabel(table[0]?.expense ?? 0)}
              />
              <Stat
                label="今年の収支(A-B)（万円）"
                value={manLabel(table[0]?.net ?? 0)}
              />
              <Stat
                label={`${startYear + years - 1}年末の貯蓄残高（万円）`}
                value={manLabel(table[table.length - 1]?.savings ?? 0)}
              />
            </div>
          </Card>

          <Card title="推移グラフ（収入・支出・貯蓄）">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={table}
                  margin={{ top: 10, right: 16, bottom: 8, left: 72 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis
                    width={64}
                    tickMargin={8}
                    tickFormatter={(v) =>
                      `${(v / 10_000).toLocaleString("ja-JP")}万円`
                    }
                  />
                  <Tooltip
                    formatter={(val: number | string) =>
                      `${(Number(val) / 10_000).toLocaleString("ja-JP")}万円`
                    }
                    labelFormatter={(y: number | string) => `${y}年`}
                  />
                  <Legend wrapperStyle={{ paddingTop: 8 }} />
                  <Line
                    type="monotone"
                    dataKey="income"
                    name="収入(A)"
                    dot={false}
                    stroke="#2563eb"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="expense"
                    name="支出(B)"
                    dot={false}
                    stroke="#dc2626"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                  />
                  <Line
                    type="monotone"
                    dataKey="savings"
                    name="貯蓄残高"
                    dot={{ r: 2 }}
                    stroke="#16a34a"
                    strokeWidth={3}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="詳細（年次テーブル）">
            <div className="overflow-auto rounded-xl border bg-white">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <Th>年</Th>
                    <Th>年齢（/区切り）</Th>
                    <Th className="text-right">収入合計(A)（万円）</Th>
                    <Th className="text-right">支出合計(B)（万円）</Th>
                    <Th className="text-right">年間収支(A-B)（万円）</Th>
                    <Th className="text-right">貯蓄残高（万円）</Th>
                  </tr>
                </thead>
                <tbody>
                  {table.map((r) => (
                    <tr key={r.year} className="border-t hover:bg-gray-50">
                      <Td>{r.year}</Td>
                      <Td>{r.ages}</Td>
                      <Td className="text-right">{manLabel(r.income)}</Td>
                      <Td className="text-right">{manLabel(r.expense)}</Td>
                      <Td className="text-right">{manLabel(r.net)}</Td>
                      <Td className="text-right font-medium">
                        {manLabel(r.savings)}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="使い方・考え方（簡易版）">
            <ol className="list-decimal pl-5 space-y-1 text-sm text-gray-700">
              <li>金額はすべて「万円」単位で入力・表示されます（内部計算は円）。</li>
              <li>開始年・年数・初期貯蓄・前提（物価/給与/年利）を設定します。</li>
              <li>世帯メンバーの生年とベース年収（万円）を入力します。</li>
              <li>定常支出は物価上昇率を反映して将来値で計算します。</li>
              <li>引越し・車購入・学費ピークなどは「一時的な収支」（万円）に＋/−で追加します。</li>
              <li>CSV出力は万円単位です。</li>
            </ol>
            <p className="text-xs text-gray-500 mt-2">
              ※ 本ツールは将来の金額を推計する簡易モデルです。実際の家計判断は公的制度や税制、投資リスクをご確認のうえで行ってください。
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

      <footer className="max-w-6xl mx-auto px-4 pb-10 text-xs text-gray-500">
        <p>「家計のキャッシュフロー表」</p>
      </footer>
    </div>
  );

  // -------------------- ヘルパー --------------------
  function addMember() {
    setMembers((prev) => [
      ...prev,
      {
        id: cryptoRandomId(),
        name: `家族${prev.length + 1}`,
        birthYear: thisYear - 30,
        baseIncome: 0,
      },
    ]);
  }
  function updateMember(id: string, patch: Partial<Member>) {
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }
  function removeMember(id: string) {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  }
  function updateExpense(key: string, amount: number) {
    setExpenses((prev) => prev.map((e) => (e.key === key ? { ...e, amount } : e)));
  }
  function addOneOff() {
    setOneOffs((prev) => [
      ...prev,
      { id: cryptoRandomId(), year: startYear, label: "", amount: 0 },
    ]);
  }
  function updateOneOff(id: string, patch: Partial<OneOff>) {
    setOneOffs((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  }
  function removeOneOff(id: string) {
    setOneOffs((prev) => prev.filter((o) => o.id !== id));
  }
}

// -------------------- UI 小物 --------------------
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

function Stat({ label, value }: { label: string; value: string }) {
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

/** 小数などの汎用入力（単位があるとき右余白を確保） */
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
  const pr = suffix ? "pr-12" : ""; // 単位と重ならないよう右余白
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

/** 整数入力（signed可）: 表示/入力は value(円)/scale を扱う。例: scale=10000 → 万円表示 */
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
  const [focused, setFocused] = React.useState(false);
  const [inner, setInner] = React.useState<string>("");

  const displayNumber = Math.trunc(value / scale);
  const grouped = React.useMemo(() => groupInt(displayNumber), [displayNumber]);

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
            onChange(scaled * scale); // 万円→円 に戻す
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

// -------------------- ユーティリティ --------------------
function saveJSON<T>(key: string, value: T) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}
function cryptoRandomId() {
  return Math.random().toString(36).slice(2, 10);
}

/** Base64 (UTF-8 対応) */
function b64e(s: string) {
  return btoa(encodeURIComponent(s));
}
function b64d(s: string) {
  return decodeURIComponent(atob(s));
}

/** 円 → 万円（四捨五入。切り捨てにしたい場合は Math.trunc に変更） */
function yenToMan(yen: number): number {
  return Math.round(yen / 10_000);
}
/** 万円ラベル（例: 6000000 → "600万円"） */
function manLabel(yen: number): string {
  return `${yenToMan(yen).toLocaleString("ja-JP")}万円`;
}

/** 3桁区切りの整数文字列 */
function groupInt(n: number): string {
  return new Intl.NumberFormat("ja-JP", {
    maximumFractionDigits: 0,
  }).format(Math.trunc(n));
}
/** 整数（先頭0除去） */
function cleanInt(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  return digits.replace(/^0+(?=\d)/, "");
}
/** 符号つき整数（先頭のみ-許可・先頭0除去） */
function cleanSignedInt(raw: string): string {
  let s = raw.replace(/[^\d-]/g, "");
  s = s.replace(/(?!^)-/g, "");
  s = s.replace(/^(-?)0+(?=\d)/, "$1");
  return s;
}
function clamp01(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}
