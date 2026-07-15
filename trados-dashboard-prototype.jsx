import { useState, useRef, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
} from "recharts";
import {
  ShieldAlert, TrendingDown, Users, Activity, Send, ArrowUpRight, ArrowDownRight, Minus,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// MOCK DATA — CDO: edit these constants to match each prospect's
// firm size before a demo. All data is synthetic.
// ─────────────────────────────────────────────────────────────

const FIRM = { name: "Demo Prop Firm", tradersMonitored: 1240, region: "London, UK" };

const KPIS = {
  behavioralRiskScore: 68,
  preventableLossMonth: 18450,
  activeAlerts: 14,
};

const PATTERNS = ["Revenge Trading", "Overleveraging", "Loss Chasing", "FOMO Entry", "Tilt Session"];

const TIMEFRAMES = {
  "1D": Array.from({ length: 24 }, (_, i) => ({
    label: `${String(i).padStart(2, "0")}:00`,
    total: Math.round(300 + Math.random() * 900 + (i > 13 && i < 17 ? 800 : 0)),
    behavioral: Math.round(100 + Math.random() * 400 + (i > 13 && i < 17 ? 600 : 0)),
  })),
  "1W": ["Mon", "Tue", "Wed", "Thu", "Fri"].map((d, i) => ({
    label: d,
    total: [4200, 6100, 3800, 9400, 5200][i],
    behavioral: [1900, 3400, 1200, 6800, 2600][i],
  })),
  "1M": Array.from({ length: 4 }, (_, i) => ({
    label: `Week ${i + 1}`,
    total: [21000, 18400, 26800, 19900][i],
    behavioral: [11200, 8900, 17400, 10100][i],
  })),
  "3M": ["May", "Jun", "Jul"].map((m, i) => ({
    label: m,
    total: [84000, 91000, 86100][i],
    behavioral: [41000, 52000, 47600][i],
  })),
};

const TRADERS = [
  { id: "TR-0447", score: 91, pattern: "Revenge Trading", trend: "up", last: "2h ago", loss30d: 4120 },
  { id: "TR-0219", score: 87, pattern: "Overleveraging", trend: "up", last: "41m ago", loss30d: 3380 },
  { id: "TR-1053", score: 82, pattern: "Loss Chasing", trend: "flat", last: "Yesterday", loss30d: 2910 },
  { id: "TR-0871", score: 76, pattern: "Tilt Session", trend: "down", last: "3d ago", loss30d: 2240 },
  { id: "TR-0134", score: 74, pattern: "Revenge Trading", trend: "up", last: "5h ago", loss30d: 1980 },
  { id: "TR-0692", score: 69, pattern: "FOMO Entry", trend: "flat", last: "Yesterday", loss30d: 1610 },
  { id: "TR-0958", score: 63, pattern: "Overleveraging", trend: "down", last: "4d ago", loss30d: 1345 },
  { id: "TR-0305", score: 58, pattern: "Loss Chasing", trend: "down", last: "6d ago", loss30d: 990 },
];

const gbp = (n) => "£" + n.toLocaleString("en-GB");

// ─────────────────────────────────────────────────────────────
// AI RISK ANALYST — grounded on the dashboard's live state
// ─────────────────────────────────────────────────────────────

const buildSystemPrompt = (timeframe) => `You are the TradOS Risk Analyst, an AI assistant embedded in a behavioral risk dashboard used by the Head of Risk at a proprietary trading firm.

CURRENT DASHBOARD STATE (the ONLY data you may reference):
${JSON.stringify({ firm: FIRM, kpis: KPIS, activeTimeframe: timeframe, lossSeries: TIMEFRAMES[timeframe], topRiskTraders: TRADERS }, null, 2)}

Rules:
1. Only reference data present in the state above. If asked about data not present, say it is not in the current view.
2. Voice: quantitative risk analyst. Concise, numbers-first, no filler.
3. Currency is GBP. Trader IDs are anonymized — never speculate about identities.
4. When asked "what should I do", give ONE concrete intervention tied to a named behavioral pattern and a named trader ID or cohort.
5. Maximum 120 words per answer.`;

async function askAnalyst(history, timeframe) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: buildSystemPrompt(timeframe),
      messages: history.map((m) => ({ role: m.role, content: m.text })),
    }),
  });
  const data = await response.json();
  return data.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

// ─────────────────────────────────────────────────────────────
// UI
// ─────────────────────────────────────────────────────────────

const scoreTone = (s) =>
  s >= 80 ? "text-rose-400" : s >= 65 ? "text-amber-400" : "text-emerald-400";

const TrendIcon = ({ t }) =>
  t === "up" ? (
    <ArrowUpRight size={14} className="text-rose-400" />
  ) : t === "down" ? (
    <ArrowDownRight size={14} className="text-emerald-400" />
  ) : (
    <Minus size={14} className="text-slate-500" />
  );

function Kpi({ icon: Icon, label, value, sub, tone }) {
  return (
    <div className="bg-[#10151f] border border-[#1c2433] rounded-md px-4 py-3 flex-1 min-w-[160px]">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-slate-500 font-medium">
        <Icon size={13} /> {label}
      </div>
      <div className={`mt-1.5 text-2xl font-semibold tabular-nums ${tone || "text-slate-100"}`}>{value}</div>
      {sub && <div className="text-[11px] text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function TradOSDashboard() {
  const [timeframe, setTimeframe] = useState("1W");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Risk Analyst online. This week's behavioral (preventable) loss is £15,900 of £28,700 total — 55%. Thursday drove £6,800 of it, led by revenge-trading in the top cohort. Ask me anything about the current view.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const send = async () => {
    const q = input.trim();
    if (!q || busy) return;
    const next = [...messages, { role: "user", text: q }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const answer = await askAnalyst(next, timeframe);
      setMessages((m) => [...m, { role: "assistant", text: answer }]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: "Connection error reaching the analyst service. Retry the question." },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const series = TIMEFRAMES[timeframe];

  return (
    <div className="min-h-screen bg-[#0a0e15] text-slate-200 font-sans">
      {/* Header */}
      <header className="border-b border-[#1c2433] px-5 py-3 flex items-center justify-between">
        <div className="flex items-baseline gap-3">
          <span className="text-[15px] font-semibold tracking-tight text-slate-100">
            TradOS<span className="text-sky-400">·</span>Risk
          </span>
          <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
            {FIRM.name} — {FIRM.region}
          </span>
        </div>
        <div className="text-[11px] text-slate-500 tabular-nums">
          Live · {FIRM.tradersMonitored.toLocaleString()} traders instrumented
        </div>
      </header>

      <div className="flex flex-col xl:flex-row gap-4 p-4 max-w-[1500px] mx-auto">
        {/* Left: metrics + chart + table */}
        <main className="flex-1 min-w-0 space-y-4">
          {/* KPI band */}
          <div className="flex gap-3 flex-wrap">
            <Kpi
              icon={Activity}
              label="Behavioral Risk Score"
              value={KPIS.behavioralRiskScore}
              sub="Firm-wide · 0–100"
              tone={scoreTone(KPIS.behavioralRiskScore)}
            />
            <Kpi
              icon={TrendingDown}
              label="Preventable Loss / Mo"
              value={gbp(KPIS.preventableLossMonth)}
              sub="Attributed to behavioral patterns"
              tone="text-rose-400"
            />
            <Kpi icon={ShieldAlert} label="Active Alerts" value={KPIS.activeAlerts} sub="Awaiting risk review" />
            <Kpi
              icon={Users}
              label="Traders Monitored"
              value={FIRM.tradersMonitored.toLocaleString()}
              sub="Across all cohorts"
            />
          </div>

          {/* Loss chart */}
          <section className="bg-[#10151f] border border-[#1c2433] rounded-md p-4">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h2 className="text-[13px] font-semibold text-slate-300">
                Loss Attribution — Total vs Behavioral (Preventable)
              </h2>
              <div className="flex gap-1">
                {Object.keys(TIMEFRAMES).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`px-2.5 py-1 text-[11px] rounded font-medium tabular-nums transition-colors ${
                      timeframe === tf
                        ? "bg-sky-500/15 text-sky-300 border border-sky-500/40"
                        : "text-slate-500 border border-transparent hover:text-slate-300"
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="#1c2433" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#475569"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => "£" + (v >= 1000 ? (v / 1000).toFixed(0) + "k" : v)}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#0a0e15",
                      border: "1px solid #1c2433",
                      borderRadius: 6,
                      fontSize: 12,
                    }}
                    formatter={(v, name) => [gbp(v), name === "total" ? "Total loss" : "Behavioral loss"]}
                  />
                  <Legend
                    formatter={(v) => (
                      <span className="text-[11px] text-slate-400">
                        {v === "total" ? "Total loss" : "Behavioral (preventable) loss"}
                      </span>
                    )}
                  />
                  <Line type="monotone" dataKey="total" stroke="#64748b" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="behavioral" stroke="#f43f5e" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Trader risk table */}
          <section className="bg-[#10151f] border border-[#1c2433] rounded-md overflow-hidden">
            <div className="px-4 py-3 border-b border-[#1c2433] flex items-center justify-between">
              <h2 className="text-[13px] font-semibold text-slate-300">Highest-Risk Traders — 30 Days</h2>
              <span className="text-[11px] text-slate-500">IDs anonymized</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-left text-slate-500 uppercase tracking-[0.1em] text-[10px]">
                    <th className="px-4 py-2 font-medium">Trader</th>
                    <th className="px-4 py-2 font-medium">Risk Score</th>
                    <th className="px-4 py-2 font-medium">Dominant Pattern</th>
                    <th className="px-4 py-2 font-medium">Trend</th>
                    <th className="px-4 py-2 font-medium">Last Incident</th>
                    <th className="px-4 py-2 font-medium text-right">30d Behavioral Loss</th>
                  </tr>
                </thead>
                <tbody>
                  {TRADERS.map((t) => (
                    <tr key={t.id} className="border-t border-[#151b28] hover:bg-[#141a26] transition-colors">
                      <td className="px-4 py-2.5 font-mono text-slate-300">{t.id}</td>
                      <td className={`px-4 py-2.5 font-semibold tabular-nums ${scoreTone(t.score)}`}>{t.score}</td>
                      <td className="px-4 py-2.5 text-slate-300">{t.pattern}</td>
                      <td className="px-4 py-2.5"><TrendIcon t={t.trend} /></td>
                      <td className="px-4 py-2.5 text-slate-500">{t.last}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-rose-300">{gbp(t.loss30d)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>

        {/* Right: Risk Analyst chat */}
        <aside className="xl:w-[360px] w-full bg-[#10151f] border border-[#1c2433] rounded-md flex flex-col h-[560px] xl:h-auto xl:max-h-[calc(100vh-110px)] xl:sticky xl:top-4">
          <div className="px-4 py-3 border-b border-[#1c2433]">
            <h2 className="text-[13px] font-semibold text-slate-300 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Risk Analyst
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Answers reference the current dashboard view ({timeframe})</p>
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`text-[12.5px] leading-relaxed rounded-md px-3 py-2 max-w-[92%] whitespace-pre-wrap ${
                  m.role === "user"
                    ? "ml-auto bg-sky-500/10 border border-sky-500/25 text-sky-100"
                    : "bg-[#161d2b] border border-[#1c2433] text-slate-300"
                }`}
              >
                {m.text}
              </div>
            ))}
            {busy && (
              <div className="bg-[#161d2b] border border-[#1c2433] rounded-md px-3 py-2 text-[12px] text-slate-500 w-fit">
                Analyzing…
              </div>
            )}
          </div>
          <div className="p-3 border-t border-[#1c2433] flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="e.g. Which pattern cost us most this week?"
              className="flex-1 bg-[#0a0e15] border border-[#1c2433] rounded px-3 py-2 text-[12.5px] text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-sky-500/50"
            />
            <button
              onClick={send}
              disabled={busy}
              className="px-3 rounded bg-sky-500/15 border border-sky-500/40 text-sky-300 hover:bg-sky-500/25 disabled:opacity-40 transition-colors"
              aria-label="Send question"
            >
              <Send size={15} />
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
