import { useState, useEffect, useCallback, useRef } from "react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart,
  PolarGrid, PolarAngleAxis, Radar } from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "./lib/supabase";
import toast from "react-hot-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import Papa from "papaparse";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const ROLES = { ADMIN: "admin", CREATOR: "creator", MANAGER: "manager" };
const INACTIVITY_MS = 15 * 60 * 1000;

const QUESTION_TYPES = [
  { id: "radio",         label: "Single Choice",   icon: "⊙", desc: "One option from a list" },
  { id: "checkbox",      label: "Multiple Choice",  icon: "☑", desc: "One or more options" },
  { id: "rating_star",   label: "Star Rating",      icon: "★", desc: "Visual 1–5 star scale" },
  { id: "rating_number", label: "Number Scale",     icon: "🔢", desc: "Custom numeric range" },
  { id: "likert",        label: "Likert Scale",     icon: "⟺", desc: "Agreement spectrum" },
  { id: "nps",           label: "NPS Score",        icon: "📊", desc: "Net Promoter 0–10" },
  { id: "text",          label: "Free Text",        icon: "✏", desc: "Open-ended answer" },
  { id: "dropdown",      label: "Dropdown",         icon: "▾", desc: "Select from list" },
];

const LIKERT_OPTIONS = [
  "Strongly Agree","Agree","Partially Agree",
  "Neutral","Partially Disagree","Disagree","Strongly Disagree"
];

const CHART_COLORS = ["#6366f1","#8b5cf6","#06b6d4","#10b981","#f59e0b","#ef4444","#ec4899"];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const genId = () => crypto.randomUUID();
const genToken = () => crypto.randomUUID().replace(/-/g, "").slice(0, 16);
const statusColor = s => ({ active:"emerald", paused:"amber", draft:"slate", closed:"red" }[s] || "slate");

function exportCSV(rows, filename) {
  const csv = Papa.unparse(rows);
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })),
    download: filename
  });
  a.click();
}

async function exportAnalyticsPDF(survey, data) {
  const doc = new jsPDF();
  doc.setFontSize(20);
  doc.text("Elevate Survey — Analytics Report", 14, 22);
  doc.setFontSize(12);
  doc.text(survey?.title || "Survey Report", 14, 32);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 40);

  autoTable(doc, {
    startY: 50,
    head: [["Metric", "Value"]],
    body: [
      ["Total Responses", data.totalResponses],
      ["Completion Rate", `${data.completionRate}%`],
      ["Average Rating", data.avgRating],
      ["NPS Score", data.npsScore],
    ],
    theme: "grid",
    headStyles: { fillColor: [99, 102, 241] },
  });

  if (data.aiInsights?.length) {
    const y = doc.lastAutoTable.finalY + 15;
    doc.setFontSize(14);
    doc.text("AI Insights", 14, y);
    autoTable(doc, {
      startY: y + 5,
      head: [["Type", "Title", "Detail"]],
      body: data.aiInsights.map(i => [i.type, i.title, i.detail]),
      theme: "striped",
      columnStyles: { 2: { cellWidth: 100 } },
    });
  }

  doc.save(`${survey?.title || "report"}-analytics.pdf`);
}

// ─── UI PRIMITIVES ────────────────────────────────────────────────────────────
function Badge({ color = "slate", dot, children }) {
  const map = {
    emerald: "bg-emerald-500/15 text-emerald-400 ring-emerald-500/25",
    amber:   "bg-amber-500/15 text-amber-400 ring-amber-500/25",
    red:     "bg-red-500/15 text-red-400 ring-red-500/25",
    indigo:  "bg-indigo-500/15 text-indigo-400 ring-indigo-500/25",
    violet:  "bg-violet-500/15 text-violet-400 ring-violet-500/25",
    cyan:    "bg-cyan-500/15 text-cyan-400 ring-cyan-500/25",
    slate:   "bg-slate-500/15 text-slate-400 ring-slate-500/25",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${map[color]}`}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

function Btn({ children, variant="primary", size="md", onClick, disabled, icon, className="", type="button" }) {
  const base = "inline-flex items-center gap-2 font-medium rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:opacity-50 disabled:cursor-not-allowed select-none";
  const S = { sm:"px-3 py-1.5 text-xs", md:"px-4 py-2.5 text-sm", lg:"px-6 py-3 text-base" };
  const V = {
    primary:   "bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:from-indigo-400 hover:to-violet-400 shadow-lg shadow-indigo-500/20 focus:ring-indigo-500",
    secondary: "bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-600 hover:border-slate-500 focus:ring-slate-500",
    ghost:     "text-slate-400 hover:text-slate-200 hover:bg-slate-800 focus:ring-slate-500",
    danger:    "bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/30 focus:ring-red-500",
    success:   "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 focus:ring-emerald-500",
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${S[size]} ${V[variant]} ${className}`}>
      {icon && <span>{icon}</span>}
      {children}
    </button>
  );
}

function Field({ label, required, error, children }) {
  return (
    <div>
      {label && <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}{required && <span className="text-red-400 ml-1">*</span>}</label>}
      {children}
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}

function Input({ label, value, onChange, placeholder, type="text", required, error, className="" }) {
  return (
    <Field label={label} required={required} error={error}>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className={`w-full bg-slate-800/60 border border-slate-600 text-slate-100 placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${className}`} />
    </Field>
  );
}

function Textarea({ label, value, onChange, placeholder, rows=3, className="" }) {
  return (
    <Field label={label}>
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
        className={`w-full bg-slate-800/60 border border-slate-600 text-slate-100 placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none ${className}`} />
    </Field>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <Field label={label}>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-slate-800/60 border border-slate-600 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </Field>
  );
}

function Card({ children, className="" }) {
  return <div className={`bg-slate-800/40 border border-slate-700/50 rounded-2xl ${className}`}>{children}</div>;
}

function Modal({ open, onClose, title, children, size="md" }) {
  const W = { sm:"max-w-md", md:"max-w-lg", lg:"max-w-2xl", xl:"max-w-4xl" };
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity:0, scale:0.95, y:8 }} animate={{ opacity:1, scale:1, y:0 }}
        className={`relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full ${W[size]} max-h-[90vh] flex flex-col`}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 flex-shrink-0">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">✕</button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </motion.div>
    </div>
  );
}

function StatCard({ label, value, icon, delta, color="indigo" }) {
  const C = {
    indigo: "from-indigo-500/20 to-transparent border-indigo-500/30 [--icon:theme(colors.indigo.500/20)] [--icon-text:theme(colors.indigo.400)]",
    emerald:"from-emerald-500/20 to-transparent border-emerald-500/30 [--icon:theme(colors.emerald.500/20)] [--icon-text:theme(colors.emerald.400)]",
    violet: "from-violet-500/20 to-transparent border-violet-500/30 [--icon:theme(colors.violet.500/20)] [--icon-text:theme(colors.violet.400)]",
    amber:  "from-amber-500/20 to-transparent border-amber-500/30 [--icon:theme(colors.amber.500/20)] [--icon-text:theme(colors.amber.400)]",
  };
  return (
    <div className={`bg-gradient-to-br ${C[color]} border rounded-2xl p-6`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400 font-medium">{label}</p>
          <p className="text-3xl font-bold text-white mt-1 tabular-nums">{value}</p>
          {delta !== undefined && (
            <p className={`text-xs mt-2 font-medium ${delta >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}% vs last month
            </p>
          )}
        </div>
        <div className="w-12 h-12 rounded-2xl bg-current/10 flex items-center justify-center text-2xl opacity-80">{icon}</div>
      </div>
    </div>
  );
}

function Avatar({ name, size="sm" }) {
  const initials = (name || "?").split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase();
  const HUES = ["bg-indigo-500","bg-violet-500","bg-emerald-500","bg-amber-500","bg-cyan-500","bg-rose-500"];
  const bg = HUES[(name || "").charCodeAt(0) % HUES.length];
  const S = { xs:"w-7 h-7 text-xs", sm:"w-9 h-9 text-sm", md:"w-11 h-11 text-base", lg:"w-14 h-14 text-lg" };
  return <div className={`${bg} ${S[size]} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0`}>{initials}</div>;
}

function Toggle({ value, onChange, label }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <button type="button" role="switch" aria-checked={value} onClick={() => onChange(!value)}
        className={`w-11 h-6 rounded-full transition-colors relative focus:outline-none ${value ? "bg-indigo-500" : "bg-slate-600"}`}>
        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${value ? "translate-x-6" : "translate-x-1"}`} />
      </button>
      {label && <span className="text-sm text-slate-300">{label}</span>}
    </label>
  );
}

// ─── SURVEY QUESTION INPUTS ────────────────────────────────────────────────────
function StarRating({ value=0, onChange, max=5 }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-2">
      {Array.from({length:max},(_,i)=>i+1).map(n => (
        <button key={n} type="button" onClick={() => onChange(n)} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
          className={`text-3xl transition-all hover:scale-110 ${(hover||value) >= n ? "text-amber-400 drop-shadow-sm" : "text-slate-600"}`}>★</button>
      ))}
    </div>
  );
}

function NpsInput({ value, onChange }) {
  return (
    <div>
      <div className="flex gap-1.5 flex-wrap">
        {Array.from({length:11},(_,i)=>i).map(n => {
          const sel = value === n;
          const getColor = (n, sel) => {
            if (sel) return n <= 6 ? "bg-red-500 border-red-400 text-white" : n <= 8 ? "bg-amber-500 border-amber-400 text-white" : "bg-emerald-500 border-emerald-400 text-white";
            return n <= 6 ? "border-slate-600 text-slate-400 hover:border-red-400 hover:text-red-400" : n <= 8 ? "border-slate-600 text-slate-400 hover:border-amber-400 hover:text-amber-400" : "border-slate-600 text-slate-400 hover:border-emerald-400 hover:text-emerald-400";
          };
          return (
            <button key={n} type="button" onClick={() => onChange(n)}
              className={`w-11 h-11 rounded-xl border text-sm font-semibold transition-all ${getColor(n,sel)}`}>{n}</button>
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-slate-500 mt-2 px-0.5">
        <span>0 — Not likely</span><span>10 — Very likely</span>
      </div>
    </div>
  );
}

function QuestionInput({ question: q, value, onChange }) {
  if (q.type === "text")
    return <textarea value={value||""} onChange={e=>onChange(e.target.value)} rows={4} placeholder="Share your thoughts..."
      className="w-full bg-slate-800/60 border border-slate-600 text-slate-100 placeholder-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />;

  if (q.type === "rating_star") return <StarRating value={value||0} onChange={onChange} />;
  if (q.type === "nps") return <NpsInput value={value} onChange={onChange} />;

  if (q.type === "rating_number") {
    const min = q.settings?.min || 1, max = q.settings?.max || 10;
    return (
      <div>
        <div className="flex gap-2 flex-wrap">
          {Array.from({length:max-min+1},(_,i)=>i+min).map(n => (
            <button key={n} type="button" onClick={() => onChange(n)}
              className={`w-11 h-11 rounded-xl border text-sm font-semibold transition-all ${value===n ? "bg-indigo-500 border-indigo-400 text-white" : "border-slate-600 text-slate-400 hover:border-indigo-400 hover:text-indigo-300"}`}>{n}</button>
          ))}
        </div>
        <div className="flex justify-between text-xs text-slate-500 mt-2 px-0.5">
          <span>{min} — Lowest</span><span>{max} — Highest</span>
        </div>
      </div>
    );
  }

  if (q.type === "radio" || q.type === "likert")
    return (
      <div className="space-y-2">
        {q.options.map(opt => (
          <label key={opt} className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${value===opt ? "border-indigo-500/60 bg-indigo-500/10" : "border-slate-700 hover:border-slate-600 hover:bg-slate-800/40"}`}>
            <input type="radio" name={q.id} value={opt} checked={value===opt} onChange={() => onChange(opt)} className="accent-indigo-500 w-4 h-4" />
            <span className="text-slate-200 text-sm">{opt}</span>
          </label>
        ))}
      </div>
    );

  if (q.type === "checkbox")
    return (
      <div className="space-y-2">
        {q.options.map(opt => {
          const checked = Array.isArray(value) && value.includes(opt);
          return (
            <label key={opt} className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${checked ? "border-indigo-500/60 bg-indigo-500/10" : "border-slate-700 hover:border-slate-600"}`}>
              <input type="checkbox" checked={checked} onChange={() => {
                const c = Array.isArray(value) ? value : [];
                onChange(checked ? c.filter(v=>v!==opt) : [...c, opt]);
              }} className="accent-indigo-500 w-4 h-4 rounded" />
              <span className="text-slate-200 text-sm">{opt}</span>
            </label>
          );
        })}
      </div>
    );

  if (q.type === "dropdown")
    return (
      <select value={value||""} onChange={e => onChange(e.target.value)}
        className="w-full bg-slate-800/60 border border-slate-600 text-slate-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
        <option value="">— Select an option —</option>
        {q.options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    );

  return <p className="text-slate-500 text-sm">Unsupported question type</p>;
}

// ─── SIDEBAR NAV ──────────────────────────────────────────────────────────────
const NAV = [
  { id:"dashboard", label:"Dashboard",     icon:"⬡", roles:["admin","creator","manager"] },
  { id:"surveys",   label:"Surveys",       icon:"📋", roles:["admin","creator","manager"] },
  { id:"links",     label:"Survey Links",  icon:"🔗", roles:["admin","creator","manager"] },
  { id:"analytics", label:"Analytics",     icon:"📊", roles:["admin","creator","manager"] },
  { id:"users",     label:"Team",          icon:"👥", roles:["admin"] },
];

function Sidebar({ page, onNav, user, onLogout }) {
  return (
    <aside className="w-64 bg-slate-900/80 backdrop-blur-xl border-r border-slate-800 flex flex-col h-screen sticky top-0 z-20">
      <div className="px-6 py-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-lg shadow-indigo-500/30">ES</div>
          <div>
            <div className="font-bold text-white text-sm leading-tight">Elevate Survey</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">Enterprise</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.filter(n => n.roles.includes(user?.role)).map(n => (
          <button key={n.id} onClick={() => onNav(n.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${page===n.id
              ? "bg-gradient-to-r from-indigo-500/20 to-violet-500/10 text-white border border-indigo-500/30"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"}`}>
            <span className="w-5 text-center text-base">{n.icon}</span>
            <span className="flex-1 text-left">{n.label}</span>
            {page===n.id && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />}
          </button>
        ))}
      </nav>
      <div className="px-4 py-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-2 mb-3">
          <Avatar name={user?.name||"?"} size="sm" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-slate-200 truncate">{user?.name}</div>
            <div className="text-xs text-slate-500 capitalize">{user?.role}</div>
          </div>
        </div>
        <button onClick={onLogout} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors">
          ⏻ Sign Out
        </button>
      </div>
    </aside>
  );
}

// ─── LOGIN ─────────────────────────────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("password123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const demos = [
    { label:"Admin",   email:"admin@elevate.io",   icon:"🛡", desc:"Full access" },
    { label:"Creator", email:"creator@elevate.io",  icon:"✏️", desc:"Build & manage" },
    { label:"Manager", email:"manager@elevate.io",  icon:"📊", desc:"View & analyze" },
  ];

  const doLogin = async (loginEmail) => {
    setLoading(true); setError("");
    // Supabase auth (swap with real logic)
    // const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail||email, password: pw });
    await new Promise(r => setTimeout(r, 700));
    const roleMap = { "admin@elevate.io":"admin", "creator@elevate.io":"creator", "manager@elevate.io":"manager" };
    const e = loginEmail || email;
    const role = roleMap[e] || "manager";
    if (!role && !loginEmail) { setError("Invalid credentials. Use a demo account."); setLoading(false); return; }
    onLogin({ id: genId(), email: e, name: e.split("@")[0].replace(/^\w/, c => c.toUpperCase()), role });
  };

  return (
    <div className="min-h-screen bg-slate-950 flex">
      <div className="hidden lg:flex flex-col w-5/12 relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950/30 to-slate-900 border-r border-slate-800/60 p-14">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_30%_20%,rgba(99,102,241,.12),transparent)]" />
        <div className="absolute bottom-0 left-0 right-0 h-64 bg-[radial-gradient(ellipse_80%_50%_at_50%_100%,rgba(139,92,246,.08),transparent)]" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-14">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center text-white font-black shadow-xl shadow-indigo-500/30">ES</div>
            <div>
              <div className="font-bold text-white text-xl tracking-tight">Elevate Survey</div>
              <div className="text-[10px] text-indigo-400 uppercase tracking-widest">Enterprise Platform</div>
            </div>
          </div>
          <h1 className="text-5xl font-extrabold text-white leading-[1.1] mb-5">
            Turn feedback<br/>into <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400">decisions</span>
          </h1>
          <p className="text-slate-400 text-lg leading-relaxed mb-12 max-w-xs">Enterprise survey platform with AI-powered insights and real-time analytics.</p>
          <div className="space-y-3.5">
            {[["🤖","AI-powered deep insights"],["⚡","Real-time response tracking"],["🔒","Enterprise-grade security"],["📊","Detailed analytics & export"]].map(([i,t]) => (
              <div key={t} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/15 flex items-center justify-center text-sm">{i}</div>
                <span className="text-slate-300 text-sm">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} className="w-full max-w-sm">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-white">Sign In</h2>
            <p className="text-slate-400 mt-1.5 text-sm">Access your workspace</p>
          </div>
          <form onSubmit={e => { e.preventDefault(); doLogin(); }} className="space-y-4">
            <Input label="Work Email" type="email" value={email} onChange={setEmail} placeholder="you@company.com" required />
            <Input label="Password" type="password" value={pw} onChange={setPw} placeholder="••••••••" required />
            {error && <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-3">{error}</div>}
            <Btn type="submit" className="w-full justify-center py-3 mt-2" disabled={loading}>
              {loading ? "Signing in…" : "Sign In →"}
            </Btn>
          </form>
          <div className="mt-8 pt-6 border-t border-slate-800">
            <p className="text-xs text-slate-500 text-center mb-3">Demo accounts</p>
            <div className="grid grid-cols-3 gap-2">
              {demos.map(d => (
                <button key={d.label} onClick={() => doLogin(d.email)}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-slate-800/60 border border-slate-700 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all group">
                  <span className="text-2xl">{d.icon}</span>
                  <span className="text-xs font-medium text-slate-300 group-hover:text-white">{d.label}</span>
                  <span className="text-[10px] text-slate-500">{d.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ─── DASHBOARD ─────────────────────────────────────────────────────────────────
function DashboardPage({ user, surveys, links, onNav }) {
  const totalResponses = surveys.reduce((a,s) => a + (s.responses||0), 0);
  const activeLinks = links.filter(l => l.status==="active").length;

  const weekData = [
    {day:"Mon",r:34},{day:"Tue",r:52},{day:"Wed",r:41},{day:"Thu",r:68},{day:"Fri",r:45},{day:"Sat",r:12},{day:"Sun",r:8}
  ];
  const distData = [
    {name:"Very Satisfied",v:38},{name:"Satisfied",v:42},{name:"Neutral",v:12},{name:"Dissatisfied",v:6},{name:"Very Dissatisfied",v:2}
  ];

  return (
    <div className="p-8 space-y-8 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Overview</h1>
        <p className="text-slate-400 mt-1 text-sm">Welcome back, {user?.name?.split(" ")[0]}. Here's what's happening today.</p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard label="Total Surveys" value={surveys.length} icon="📋" delta={8} color="indigo" />
        <StatCard label="Total Responses" value={totalResponses.toLocaleString()} icon="💬" delta={23} color="emerald" />
        <StatCard label="Active Links" value={activeLinks} icon="🔗" delta={-5} color="violet" />
        <StatCard label="Avg. Completion" value="87%" icon="✅" delta={4} color="amber" />
      </div>

      <div className="grid xl:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-semibold text-white mb-5 text-sm">Responses This Week</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weekData} barSize={28}>
              <defs><linearGradient id="bg1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366f1"/><stop offset="100%" stopColor="#8b5cf6"/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="day" stroke="#475569" tick={{ fontSize:12, fill:"#64748b" }} axisLine={false} tickLine={false} />
              <YAxis stroke="#475569" tick={{ fontSize:12, fill:"#64748b" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background:"#0f172a", border:"1px solid #1e293b", borderRadius:"12px", color:"#e2e8f0" }} cursor={{ fill:"rgba(99,102,241,0.05)" }} />
              <Bar dataKey="r" fill="url(#bg1)" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="font-semibold text-white mb-5 text-sm">Satisfaction Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={distData} dataKey="v" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={45} paddingAngle={3}>
                {distData.map((_,i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
              </Pie>
              <Tooltip contentStyle={{ background:"#0f172a", border:"1px solid #1e293b", borderRadius:"12px", color:"#e2e8f0" }} />
              <Legend wrapperStyle={{ color:"#94a3b8", fontSize:"11px" }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
          <h3 className="font-semibold text-white text-sm">Recent Surveys</h3>
          <Btn variant="ghost" size="sm" onClick={() => onNav("surveys")}>View all →</Btn>
        </div>
        <div className="divide-y divide-slate-700/30">
          {surveys.slice(0,4).map(s => (
            <div key={s.id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-700/20 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center text-sm">📋</div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-200 text-sm truncate">{s.title}</div>
                <div className="text-xs text-slate-500 mt-0.5">{s.responses||0} responses · {s.links||0} links</div>
              </div>
              <Badge color={statusColor(s.status)} dot>{s.status}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── SURVEYS LIST ──────────────────────────────────────────────────────────────
function SurveysPage({ user, surveys, onNew, onEdit, onViewAnalytics, onToggle, onDelete }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const canEdit = ["admin","creator"].includes(user?.role);

  const filtered = surveys.filter(s =>
    s.title.toLowerCase().includes(q.toLowerCase()) &&
    (filter === "all" || s.status === filter)
  );

  return (
    <div className="p-8 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Surveys</h1>
          <p className="text-slate-400 text-sm mt-1">{surveys.length} surveys in your workspace</p>
        </div>
        {canEdit && <Btn onClick={onNew} icon="+">New Survey</Btn>}
      </div>

      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative">
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search…"
            className="bg-slate-800/60 border border-slate-600 text-slate-100 placeholder-slate-500 rounded-xl pl-9 pr-4 py-2.5 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">🔍</span>
        </div>
        {["all","active","paused","draft","closed"].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3.5 py-2 rounded-xl text-xs font-medium capitalize transition-all ${filter===f ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30" : "text-slate-400 border border-slate-700 hover:border-slate-500"}`}>{f}</button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map(s => {
          const totalQ = s.sections?.reduce((a,sec) => a + sec.questions.length, 0) || 0;
          return (
            <Card key={s.id} className="p-5 hover:border-slate-600 transition-all">
              <div className="flex items-start gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                    <h3 className="font-semibold text-white text-sm">{s.title}</h3>
                    <Badge color={statusColor(s.status)} dot>{s.status}</Badge>
                  </div>
                  <p className="text-xs text-slate-400 mb-3 line-clamp-1">{s.description}</p>
                  <div className="flex gap-5 text-xs text-slate-500">
                    <span>📋 {s.sections?.length||0} sections, {totalQ} questions</span>
                    <span>💬 {s.responses||0} responses</span>
                    <span>🔗 {s.links||0} links</span>
                    <span>📅 {s.createdAt}</span>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0 flex-wrap">
                  <Btn variant="ghost" size="sm" onClick={() => onViewAnalytics(s.id)}>📊 Analytics</Btn>
                  {canEdit && <>
                    <Btn variant="ghost" size="sm" onClick={() => onEdit(s.id)}>✏ Edit</Btn>
                    <Btn variant={s.status==="active" ? "secondary" : "success"} size="sm" onClick={() => onToggle(s.id)}>
                      {s.status==="active" ? "⏸ Pause" : "▶ Resume"}
                    </Btn>
                    {user?.role==="admin" && <Btn variant="danger" size="sm" onClick={() => onDelete(s.id)}>🗑</Btn>}
                  </>}
                </div>
              </div>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-20 text-slate-500">
            <div className="text-5xl mb-4">📭</div>
            <div className="font-medium text-slate-400">No surveys found</div>
            <div className="text-sm mt-1">Try adjusting search or filters</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SURVEY BUILDER ────────────────────────────────────────────────────────────
function QuestionCard({ q, idx, total, onUpdate, onDelete, onMove }) {
  const [open, setOpen] = useState(true);
  const type = QUESTION_TYPES.find(t => t.id === q.type);

  const addOpt = () => onUpdate({ options: [...(q.options||[]), `Option ${(q.options||[]).length + 1}`] });
  const updOpt = (i,v) => onUpdate({ options: q.options.map((o,oi) => oi===i ? v : o) });
  const delOpt = (i) => onUpdate({ options: q.options.filter((_,oi) => oi!==i) });

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3.5 cursor-pointer select-none" onClick={() => setOpen(p=>!p)}>
        <span className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center text-slate-400 text-xs font-bold flex-shrink-0">{idx+1}</span>
        <span className="text-lg">{type?.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-slate-200 truncate">{q.text || <span className="text-slate-500 italic">Untitled question</span>}</div>
          <div className="text-xs text-slate-500">{type?.label}{q.required ? " · required" : ""}</div>
        </div>
        <div className="flex items-center gap-0.5" onClick={e=>e.stopPropagation()}>
          <button onClick={() => onMove(-1)} disabled={idx===0} className="p-1.5 text-slate-500 hover:text-slate-300 disabled:opacity-25 text-xs">▲</button>
          <button onClick={() => onMove(1)} disabled={idx===total-1} className="p-1.5 text-slate-500 hover:text-slate-300 disabled:opacity-25 text-xs">▼</button>
          <button onClick={onDelete} className="p-1.5 text-slate-500 hover:text-red-400 ml-1">🗑</button>
          <span className="text-slate-600 ml-1 text-xs">{open?"▲":"▼"}</span>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} transition={{duration:0.18}}>
            <div className="px-4 pb-4 pt-1 space-y-3 border-t border-slate-700/40">
              <Textarea label="Question Text" value={q.text} onChange={v => onUpdate({text:v})} placeholder="Enter your question here…" rows={2} />
              {["radio","checkbox","dropdown"].includes(q.type) && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Answer Options</label>
                  <div className="space-y-2">
                    {(q.options||[]).map((o,i) => (
                      <div key={i} className="flex gap-2">
                        <input value={o} onChange={e=>updOpt(i,e.target.value)} placeholder={`Option ${i+1}`}
                          className="flex-1 bg-slate-800/60 border border-slate-600 text-slate-100 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                        <button onClick={() => delOpt(i)} className="px-2 text-slate-500 hover:text-red-400 transition-colors">✕</button>
                      </div>
                    ))}
                    <button onClick={addOpt} className="text-xs text-indigo-400 hover:text-indigo-300 mt-1">+ Add option</button>
                  </div>
                </div>
              )}
              {q.type === "rating_number" && (
                <div className="flex gap-3">
                  <Input label="Min" type="number" value={q.settings?.min||1} onChange={v => onUpdate({settings:{...q.settings,min:Number(v)}})} className="w-24" />
                  <Input label="Max" type="number" value={q.settings?.max||10} onChange={v => onUpdate({settings:{...q.settings,max:Number(v)}})} className="w-24" />
                </div>
              )}
              {q.type === "likert" && (
                <div>
                  <label className="text-xs text-slate-400 mb-2 block">Likert Scale (default)</label>
                  <div className="flex flex-wrap gap-1.5">
                    {LIKERT_OPTIONS.map(o => <span key={o} className="px-2.5 py-1 bg-slate-700 rounded-lg text-xs text-slate-300">{o}</span>)}
                  </div>
                </div>
              )}
              <Toggle value={q.required} onChange={v => onUpdate({required:v})} label="Required question" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

function SurveyBuilderPage({ survey, onSave, onCancel }) {
  const [title, setTitle] = useState(survey?.title||"");
  const [desc, setDesc] = useState(survey?.description||"");
  const [sections, setSections] = useState(survey?.sections||[{id:genId(),title:"Section 1",questions:[]}]);
  const [activeSec, setActiveSec] = useState(0);
  const [typeModal, setTypeModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const sec = sections[activeSec];
  const addSection = () => { setSections(p=>[...p,{id:genId(),title:`Section ${p.length+1}`,questions:[]}]); setActiveSec(sections.length); };
  const updateSecTitle = (i,t) => setSections(p=>p.map((s,si)=>si===i?{...s,title:t}:s));

  const addQ = (type) => {
    const q = { id:genId(), type, text:"", required:true,
      options: type==="likert" ? [...LIKERT_OPTIONS] : ["radio","checkbox","dropdown"].includes(type) ? ["Option 1","Option 2","Option 3"] : [],
      settings: type==="rating_number" ? {min:1,max:10} : {}
    };
    setSections(p=>p.map((s,i)=>i===activeSec?{...s,questions:[...s.questions,q]}:s));
    setTypeModal(false);
  };
  const updQ = (qId, upd) => setSections(p=>p.map((s,i)=>i===activeSec?{...s,questions:s.questions.map(q=>q.id===qId?{...q,...upd}:q)}:s));
  const delQ = (qId) => setSections(p=>p.map((s,i)=>i===activeSec?{...s,questions:s.questions.filter(q=>q.id!==qId)}:s));
  const moveQ = (qId,dir) => {
    const qs=[...sec.questions]; const i=qs.findIndex(q=>q.id===qId);
    if(i+dir<0||i+dir>=qs.length) return;
    [qs[i],qs[i+dir]]=[qs[i+dir],qs[i]];
    setSections(p=>p.map((s,si)=>si===activeSec?{...s,questions:qs}:s));
  };

  const totalQ = sections.reduce((a,s)=>a+s.questions.length,0);

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">{survey ? "Edit Survey" : "New Survey"}</h1>
          <p className="text-slate-400 text-sm mt-1">{totalQ} questions across {sections.length} section{sections.length!==1?"s":""}</p>
        </div>
        <div className="flex gap-3">
          <Btn variant="secondary" onClick={onCancel}>Cancel</Btn>
          <Btn onClick={() => { setSaving(true); setTimeout(()=>{ onSave({title,description:desc,sections}); setSaving(false);},600); }} disabled={!title||saving}>
            {saving ? "Saving…" : "💾 Save Survey"}
          </Btn>
        </div>
      </div>

      <Card className="p-5 space-y-4">
        <Input label="Survey Title" value={title} onChange={setTitle} placeholder="e.g. Employee Satisfaction Q4 2024" required />
        <Textarea label="Description" value={desc} onChange={setDesc} placeholder="Brief description of what this survey covers…" rows={2} />
      </Card>

      <div className="flex gap-2 flex-wrap items-center">
        {sections.map((s,i) => (
          <button key={s.id} onClick={() => setActiveSec(i)}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${activeSec===i ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30" : "bg-slate-800/60 text-slate-400 border border-slate-700 hover:border-slate-500"}`}>
            {s.title} <span className="text-slate-500">({s.questions.length})</span>
          </button>
        ))}
        <button onClick={addSection} className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 border border-dashed border-slate-600 hover:border-indigo-500/60 hover:text-indigo-400 transition-all">+ Add Section</button>
      </div>

      <Card className="p-5 space-y-4">
        <Input label="Section Title" value={sec?.title||""} onChange={v=>updateSecTitle(activeSec,v)} placeholder="Section title" />
        <div className="space-y-3">
          {sec?.questions?.map((q,qi) => (
            <QuestionCard key={q.id} q={q} idx={qi} total={sec.questions.length}
              onUpdate={upd=>updQ(q.id,upd)} onDelete={()=>delQ(q.id)} onMove={dir=>moveQ(q.id,dir)} />
          ))}
        </div>
        <button onClick={() => setTypeModal(true)}
          className="w-full py-4 border-2 border-dashed border-slate-700 rounded-xl text-slate-500 hover:border-indigo-500/50 hover:text-indigo-400 transition-all text-sm font-medium flex items-center justify-center gap-2">
          <span className="text-xl">+</span> Add Question
        </button>
      </Card>

      <Modal open={typeModal} onClose={() => setTypeModal(false)} title="Select Question Type" size="lg">
        <div className="grid grid-cols-2 gap-3">
          {QUESTION_TYPES.map(qt => (
            <button key={qt.id} onClick={() => addQ(qt.id)}
              className="flex items-start gap-3 p-4 bg-slate-800/60 border border-slate-700 rounded-xl hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all text-left group">
              <span className="text-3xl flex-shrink-0 group-hover:scale-110 transition-transform">{qt.icon}</span>
              <div>
                <div className="font-medium text-slate-200 text-sm">{qt.label}</div>
                <div className="text-xs text-slate-500 mt-0.5">{qt.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}

// ─── SURVEY RESPONSE PAGE (Public) ────────────────────────────────────────────
function SurveyResponsePage({ survey, token, onComplete }) {
  const totalQ = survey?.sections?.reduce((a,s) => a + s.questions.length, 0) || 0;
  const [secIdx, setSecIdx] = useState(0);
  const [answers, setAnswers] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`draft_${token}`) || "{}"); } catch { return {}; }
  });
  const [submitted, setSubmitted] = useState(false);
  const saveCount = useRef(0);

  useEffect(() => {
    const n = Object.keys(answers).length;
    if (n > 0 && n % 3 === 0) {
      localStorage.setItem(`draft_${token}`, JSON.stringify(answers));
      saveCount.current++;
    }
  }, [answers, token]);

  if (!survey) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center text-slate-400 space-y-3">
        <div className="text-6xl">🔗</div>
        <div className="text-xl font-semibold text-white">Survey Not Found</div>
        <p>This link may be invalid or expired.</p>
      </div>
    </div>
  );

  if (submitted) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <motion.div initial={{scale:0.8,opacity:0}} animate={{scale:1,opacity:1}} className="text-center max-w-md">
        <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-white text-5xl shadow-2xl shadow-emerald-500/30">✓</div>
        <h2 className="text-3xl font-bold text-white mb-2">All Done!</h2>
        <p className="text-slate-400 text-lg">Your responses have been saved. Thank you!</p>
        {onComplete && <Btn className="mt-8" variant="secondary" onClick={onComplete}>← Back</Btn>}
      </motion.div>
    </div>
  );

  const secs = survey.sections || [];
  const sec = secs[secIdx];
  const answered = Object.keys(answers).length;
  const pct = totalQ > 0 ? Math.round((answered / totalQ) * 100) : 0;
  const isLast = secIdx === secs.length - 1;
  const canNext = sec?.questions?.filter(q=>q.required).every(q => {
    const v = answers[q.id];
    return v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0);
  });

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-2.5">
            <div>
              <div className="font-semibold text-white text-sm">{survey.title}</div>
              <div className="text-xs text-slate-400 mt-0.5">Section {secIdx+1} of {secs.length}: {sec?.title}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400">{answered}/{totalQ} answered</div>
              <div className="text-xs text-indigo-400 font-semibold">{pct}%</div>
            </div>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <motion.div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
              initial={{width:0}} animate={{width:`${pct}%`}} transition={{duration:0.4}} />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10">
        <AnimatePresence mode="wait">
          <motion.div key={secIdx} initial={{opacity:0,x:24}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-24}} className="space-y-5">
            <h2 className="text-xl font-bold text-white">{sec?.title}</h2>
            {sec?.questions?.map((q,qi) => (
              <Card key={q.id} className="p-5">
                <div className="flex gap-2 mb-4">
                  <span className="text-indigo-400 font-bold text-sm mt-0.5 flex-shrink-0">Q{qi+1}.</span>
                  <p className="text-slate-200 font-medium text-sm leading-relaxed">{q.text}{q.required && <span className="text-red-400 ml-1">*</span>}</p>
                </div>
                <QuestionInput question={q} value={answers[q.id]} onChange={v => setAnswers(p=>({...p,[q.id]:v}))} />
              </Card>
            ))}
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-between mt-8 pt-6 border-t border-slate-800">
          <Btn variant="secondary" onClick={() => setSecIdx(p => Math.max(0, p-1))} disabled={secIdx===0}>← Previous</Btn>
          {isLast
            ? <Btn onClick={() => { localStorage.removeItem(`draft_${token}`); setSubmitted(true); }} disabled={!canNext}>Submit Survey ✓</Btn>
            : <Btn onClick={() => setSecIdx(p => p+1)} disabled={!canNext}>Next Section →</Btn>
          }
        </div>
      </div>
    </div>
  );
}

// ─── ANALYTICS ─────────────────────────────────────────────────────────────────
function AnalyticsPage({ survey }) {
  const [aiLoading, setAiLoading] = useState(false);
  const weekData = [{day:"Mon",r:34},{day:"Tue",r:52},{day:"Wed",r:41},{day:"Thu",r:68},{day:"Fri",r:45},{day:"Sat",r:12},{day:"Sun",r:8}];
  const deptData = [{dept:"Dept A",v:89},{dept:"Dept B",v:67},{dept:"Dept C",v:52},{dept:"Dept D",v:39}];
  const satData = [{name:"Very Satisfied",v:38},{name:"Satisfied",v:42},{name:"Neutral",v:12},{name:"Dissatisfied",v:6},{name:"Very Dissatisfied",v:2}];
  const radarData = [{m:"Work Env",s:4.2},{m:"Management",s:3.8},{m:"Growth",s:3.5},{m:"Culture",s:4.5},{m:"Benefits",s:4.0},{m:"Balance",s:3.9}];
  const nps = { promoters:56, passives:28, detractors:16, score:40 };

  const insights = [
    { type:"positive", icon:"✅", title:"Strong Culture Score", detail:"85% of respondents rated culture 4★ or higher — 12% above industry average.", badge:"text-emerald-400", border:"border-emerald-500/25", bg:"bg-emerald-500/8" },
    { type:"warning",  icon:"⚠️", title:"Career Growth Decline", detail:"Growth scores dropped 0.7 pts from Q3 to 6.8/10. Recommend reviewing mentorship & promotion clarity.", badge:"text-amber-400", border:"border-amber-500/25", bg:"bg-amber-500/8" },
    { type:"info",     icon:"💡", title:"Hybrid Work Preference", detail:"67% prefer 1–4 day hybrid schedules. Formalizing policy could improve retention by ~18%.", badge:"text-cyan-400", border:"border-cyan-500/25", bg:"bg-cyan-500/8" },
    { type:"action",   icon:"🚀", title:"High ROI Action", detail:"Launch structured career ladders. Employees with clear growth paths are 3× more likely to stay long-term.", badge:"text-violet-400", border:"border-violet-500/25", bg:"bg-violet-500/8" },
  ];

  return (
    <div className="p-8 space-y-8 max-w-7xl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-slate-400 text-sm mt-1">{survey?.title || "Employee Satisfaction Q4 2024"}</p>
        </div>
        <div className="flex gap-3">
          <Btn variant="secondary" size="sm" onClick={() => exportCSV(weekData.map(d=>({Day:d.day,Responses:d.r})), "responses.csv")} icon="📊">Export CSV</Btn>
          <Btn variant="secondary" size="sm" onClick={() => exportAnalyticsPDF(survey, {totalResponses:247,completionRate:87,avgRating:"4.2/5",npsScore:40,aiInsights:insights.map(i=>({type:i.type,title:i.title,detail:i.detail}))})} icon="📄">Export PDF</Btn>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard label="Total Responses" value="247"    icon="💬" delta={23} color="indigo" />
        <StatCard label="Completion Rate" value="87%"    icon="✅" delta={4}  color="emerald" />
        <StatCard label="Avg. Rating"     value="4.2★"   icon="★"  delta={2}  color="violet" />
        <StatCard label="NPS Score"       value={nps.score} icon="📊" delta={8} color="amber" />
      </div>

      <div className="grid xl:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-sm font-semibold text-white mb-5">Daily Responses</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={weekData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="day" stroke="#475569" tick={{fontSize:12,fill:"#64748b"}} axisLine={false} tickLine={false} />
              <YAxis stroke="#475569" tick={{fontSize:12,fill:"#64748b"}} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:"12px",color:"#e2e8f0"}} />
              <Line type="monotone" dataKey="r" stroke="#6366f1" strokeWidth={3} dot={{fill:"#6366f1",r:4}} activeDot={{r:6}} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="text-sm font-semibold text-white mb-5">By Department</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={deptData} layout="vertical" barSize={22}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis type="number" stroke="#475569" tick={{fontSize:12,fill:"#64748b"}} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="dept" stroke="#475569" tick={{fontSize:12,fill:"#64748b"}} axisLine={false} tickLine={false} width={70} />
              <Tooltip contentStyle={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:"12px",color:"#e2e8f0"}} />
              <Bar dataKey="v" fill="#8b5cf6" radius={[0,6,6,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="text-sm font-semibold text-white mb-5">Satisfaction Breakdown</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={satData} dataKey="v" nameKey="name" cx="50%" cy="50%" outerRadius={85} innerRadius={48} paddingAngle={3}>
                {satData.map((_,i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
              </Pie>
              <Tooltip contentStyle={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:"12px",color:"#e2e8f0"}} />
              <Legend wrapperStyle={{color:"#94a3b8",fontSize:"11px"}} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="text-sm font-semibold text-white mb-5">Category Scores</h3>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#1e293b" />
              <PolarAngleAxis dataKey="m" tick={{fill:"#64748b",fontSize:11}} />
              <Radar dataKey="s" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} strokeWidth={2} />
              <Tooltip contentStyle={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:"12px",color:"#e2e8f0"}} />
            </RadarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* NPS */}
      <Card className="p-6">
        <h3 className="text-sm font-semibold text-white mb-5">Net Promoter Score</h3>
        <div className="grid grid-cols-3 gap-4 mb-5">
          {[{l:"Promoters",v:nps.promoters,c:"emerald",d:"Score 9–10"},{l:"Passives",v:nps.passives,c:"amber",d:"Score 7–8"},{l:"Detractors",v:nps.detractors,c:"red",d:"Score 0–6"}].map(x=>(
            <div key={x.l} className={`p-4 rounded-xl bg-${x.c}-500/10 border border-${x.c}-500/20 text-center`}>
              <div className="text-2xl font-bold text-white">{x.v}%</div>
              <div className={`text-sm font-medium text-${x.c}-400 mt-0.5`}>{x.l}</div>
              <div className="text-xs text-slate-500 mt-0.5">{x.d}</div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1 h-3 rounded-full overflow-hidden flex gap-1 bg-slate-800">
            <div className="bg-emerald-500 rounded-full transition-all" style={{width:`${nps.promoters}%`}} />
            <div className="bg-amber-500 rounded-full transition-all" style={{width:`${nps.passives}%`}} />
            <div className="bg-red-500 rounded-full transition-all" style={{width:`${nps.detractors}%`}} />
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500">NPS</div>
            <div className="text-2xl font-bold text-white">{nps.score}</div>
          </div>
        </div>
      </Card>

      {/* AI Insights */}
      <div>
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <div>
            <h3 className="text-xl font-bold text-white">🤖 AI-Powered Insights</h3>
            <p className="text-slate-400 text-sm mt-0.5">Deep analysis powered by Claude AI — summarizes patterns and recommends actions</p>
          </div>
          <Btn variant="secondary" size="sm" onClick={() => { setAiLoading(true); setTimeout(()=>setAiLoading(false),1800); }}>↺ Regenerate</Btn>
        </div>
        {aiLoading ? (
          <Card className="p-12 text-center">
            <div className="text-4xl mb-4 animate-spin">⚙</div>
            <div className="text-slate-400">Analyzing responses with Claude AI…</div>
          </Card>
        ) : (
          <div className="grid xl:grid-cols-2 gap-4">
            {insights.map((ins,i) => (
              <motion.div key={i} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*0.08}}>
                <div className={`p-5 rounded-2xl border ${ins.border} ${ins.bg}`}>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl flex-shrink-0">{ins.icon}</span>
                    <div>
                      <div className={`font-semibold text-sm mb-1.5 ${ins.badge}`}>{ins.title}</div>
                      <p className="text-slate-300 text-sm leading-relaxed">{ins.detail}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── USERS PAGE ───────────────────────────────────────────────────────────────
function UsersPage({ users, onAdd, onUpdate, onRemove }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name:"", email:"", role:"creator" });

  return (
    <div className="p-8 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Team Management</h1>
          <p className="text-slate-400 text-sm mt-1">{users.length} members</p>
        </div>
        <Btn onClick={() => setModal(true)} icon="✉">Invite Member</Btn>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700/50">
              {["Member","Email","Role","Status","Actions"].map(h => (
                <th key={h} className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/20">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-slate-700/15 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={u.name} size="sm" />
                    <span className="text-sm font-medium text-slate-200">{u.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-400">{u.email}</td>
                <td className="px-6 py-4">
                  <select value={u.role} onChange={e => onUpdate(u.id, {role:e.target.value})}
                    className="bg-slate-800 border border-slate-600 text-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500">
                    <option value="admin">Admin</option>
                    <option value="creator">Creator</option>
                    <option value="manager">Manager</option>
                  </select>
                </td>
                <td className="px-6 py-4"><Badge color={u.status==="active"?"emerald":"red"} dot>{u.status}</Badge></td>
                <td className="px-6 py-4">
                  <div className="flex gap-1">
                    <button onClick={() => onUpdate(u.id,{status:u.status==="active"?"inactive":"active"})} className="text-xs px-2 py-1 text-slate-400 hover:text-amber-400 rounded transition-colors">
                      {u.status==="active"?"Deactivate":"Activate"}
                    </button>
                    <button onClick={() => onRemove(u.id)} className="text-xs px-2 py-1 text-slate-400 hover:text-red-400 rounded transition-colors">Remove</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title="Invite Team Member">
        <div className="space-y-4">
          <Input label="Full Name" value={form.name} onChange={v=>setForm(p=>({...p,name:v}))} placeholder="Jane Smith" required />
          <Input label="Work Email" type="email" value={form.email} onChange={v=>setForm(p=>({...p,email:v}))} placeholder="jane@company.com" required />
          <Select label="Role" value={form.role} onChange={v=>setForm(p=>({...p,role:v}))}
            options={[{value:"creator",label:"Survey Creator"},{value:"manager",label:"Survey Manager"},{value:"admin",label:"Admin"}]} />
          <div className="flex gap-3 pt-2">
            <Btn variant="secondary" className="flex-1 justify-center" onClick={() => setModal(false)}>Cancel</Btn>
            <Btn className="flex-1 justify-center" onClick={() => {
              if (!form.name||!form.email) return;
              onAdd({...form,id:genId(),status:"active"});
              setModal(false); setForm({name:"",email:"",role:"creator"});
            }}>Send Invite</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── LINKS PAGE ───────────────────────────────────────────────────────────────
function LinksPage({ user, surveys, links, onAdd, onRemove, onCopy }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ surveyId: surveys[0]?.id||"", email:"" });
  const canManage = ["admin","creator"].includes(user?.role);
  const getTitle = id => surveys.find(s=>s.id===id)?.title || "Unknown";

  return (
    <div className="p-8 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Survey Links</h1>
          <p className="text-slate-400 text-sm mt-1">Generate unique links with full click & conversion tracking</p>
        </div>
        {canManage && <Btn onClick={() => setModal(true)} icon="🔗">Generate Link</Btn>}
      </div>

      <div className="grid grid-cols-3 gap-5">
        <StatCard label="Total Links"     value={links.length}                                         icon="🔗" color="indigo" />
        <StatCard label="Total Clicks"    value={links.reduce((a,l)=>a+l.clicks,0).toLocaleString()}   icon="👆" color="violet" />
        <StatCard label="Total Responses" value={links.reduce((a,l)=>a+l.responses,0).toLocaleString()} icon="💬" color="emerald" />
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                {["Recipient","Survey","Clicks","Responses","Conversion","Status",""].map(h=>(
                  <th key={h} className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/20">
              {links.map(link => {
                const conv = link.clicks > 0 ? Math.round((link.responses/link.clicks)*100) : 0;
                return (
                  <tr key={link.id} className="hover:bg-slate-700/15 transition-colors">
                    <td className="px-5 py-4">
                      <div className="text-sm font-medium text-slate-200">{link.email}</div>
                      <div className="text-xs font-mono text-slate-500 mt-0.5">{link.token}</div>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-400 max-w-40 truncate">{getTitle(link.surveyId)}</td>
                    <td className="px-5 py-4">
                      <span className="text-sm font-bold text-white">{link.clicks.toLocaleString()}</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm font-bold text-white">{link.responses}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full" style={{width:`${conv}%`}} />
                        </div>
                        <span className="text-xs text-slate-300 font-medium">{conv}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-4"><Badge color={statusColor(link.status)} dot>{link.status}</Badge></td>
                    <td className="px-5 py-4">
                      <div className="flex gap-1">
                        <button onClick={() => onCopy(link.token)} className="text-xs px-2 py-1 text-slate-400 hover:text-indigo-400 rounded hover:bg-indigo-500/10 transition-colors">Copy</button>
                        <button onClick={() => { if(window.confirm("Delete this link?")) onRemove(link.id); }} className="text-xs px-2 py-1 text-slate-400 hover:text-red-400 rounded hover:bg-red-500/10 transition-colors">Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={modal} onClose={() => setModal(false)} title="Generate Survey Link">
        <div className="space-y-4">
          <Select label="Survey" value={form.surveyId} onChange={v=>setForm(p=>({...p,surveyId:v}))}
            options={surveys.filter(s=>s.status!=="draft").map(s=>({value:s.id,label:s.title}))} />
          <Input label="Recipient Email" type="email" value={form.email} onChange={v=>setForm(p=>({...p,email:v}))} placeholder="team@department.com" required />
          <div className="bg-indigo-500/8 border border-indigo-500/20 rounded-xl p-3 text-xs text-slate-400">
            💡 Each link is uniquely tagged to this email. Clicks and responses are tracked independently per link.
          </div>
          <div className="flex gap-3 pt-2">
            <Btn variant="secondary" className="flex-1 justify-center" onClick={() => setModal(false)}>Cancel</Btn>
            <Btn className="flex-1 justify-center" onClick={() => {
              if (!form.surveyId||!form.email) return;
              onAdd({...form,id:genId(),token:genToken(),clicks:0,responses:0,createdAt:new Date().toISOString().slice(0,10),status:"active"});
              setModal(false); setForm({surveyId:surveys[0]?.id||"",email:""});
            }}>Generate Link 🔗</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── INACTIVITY HOOK ──────────────────────────────────────────────────────────
function useInactivity(ms, onFire) {
  const t = useRef();
  const reset = useCallback(() => { clearTimeout(t.current); t.current = setTimeout(onFire, ms); }, [ms, onFire]);
  useEffect(() => {
    const evts = ["mousemove","keydown","click","scroll","touchstart"];
    evts.forEach(e => window.addEventListener(e, reset, { passive:true }));
    reset();
    return () => { evts.forEach(e => window.removeEventListener(e, reset)); clearTimeout(t.current); };
  }, [reset]);
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
const INIT_SURVEYS = [
  {
    id:"s1",title:"Employee Satisfaction Q4 2024",description:"Annual employee satisfaction and engagement survey",
    status:"active",createdAt:"2024-10-01",responses:247,links:3,
    sections:[
      { id:"sec1",title:"Work Environment",questions:[
        {id:"q1",type:"rating_star",text:"How satisfied are you with your overall work environment?",required:true,options:[]},
        {id:"q2",type:"likert",text:"My team communicates effectively and transparently.",required:true,options:LIKERT_OPTIONS},
        {id:"q3",type:"radio",text:"How often do you work from home?",required:true,options:["Never","1-2 days/week","3-4 days/week","Fully remote"]},
      ]},
      { id:"sec2",title:"Career Growth",questions:[
        {id:"q4",type:"rating_number",text:"Rate your career growth opportunities (1–10)",required:true,options:[],settings:{min:1,max:10}},
        {id:"q5",type:"checkbox",text:"Which benefits do you value most? (select all that apply)",required:false,options:["Health Insurance","401k Match","Remote Work","Learning Budget","Gym Membership","Paid Parental Leave"]},
        {id:"q6",type:"text",text:"What would make the biggest impact on your career growth here?",required:false,options:[]},
      ]},
    ]
  },
  {
    id:"s2",title:"Product Feedback — Q4 Beta",description:"Gather detailed feedback from beta users",
    status:"active",createdAt:"2024-09-15",responses:89,links:5,
    sections:[
      { id:"sec3",title:"Product Experience",questions:[
        {id:"q7",type:"nps",text:"How likely are you to recommend our product to a friend or colleague?",required:true,options:[]},
        {id:"q8",type:"radio",text:"How did you first hear about us?",required:true,options:["Social Media","Word of Mouth","Search Engine","Online Ad","Referral","Other"]},
        {id:"q9",type:"dropdown",text:"Which industry best describes your company?",required:false,options:["Technology","Finance","Healthcare","Education","Retail","Manufacturing","Other"]},
        {id:"q10",type:"text",text:"What feature would you most like to see added?",required:false,options:[]},
      ]},
    ]
  },
  {id:"s3",title:"New Hire Onboarding Feedback",description:"30-day onboarding experience survey",status:"draft",createdAt:"2024-10-10",responses:0,links:0,sections:[{id:"sec4",title:"General",questions:[]}]},
];

const INIT_LINKS = [
  {id:"l1",surveyId:"s1",email:"team@dept-a.com",token:"a1b2c3d4e5f6g7h8",clicks:45,responses:38,createdAt:"2024-10-01",status:"active"},
  {id:"l2",surveyId:"s1",email:"team@dept-b.com",token:"b2c3d4e5f6g7h8i9",clicks:112,responses:97,createdAt:"2024-10-01",status:"active"},
  {id:"l3",surveyId:"s1",email:"team@dept-c.com",token:"c3d4e5f6g7h8i9j0",clicks:67,responses:52,createdAt:"2024-10-05",status:"active"},
  {id:"l4",surveyId:"s2",email:"beta@users.net",token:"d4e5f6g7h8i9j0k1",clicks:203,responses:89,createdAt:"2024-09-15",status:"active"},
];

const INIT_USERS = [
  {id:"u1",name:"Alex Morgan",email:"admin@elevate.io",role:"admin",status:"active"},
  {id:"u2",name:"Jordan Lee",email:"creator@elevate.io",role:"creator",status:"active"},
  {id:"u3",name:"Sam Rivera",email:"manager@elevate.io",role:"manager",status:"active"},
  {id:"u4",name:"Casey Kim",email:"casey@elevate.io",role:"creator",status:"inactive"},
];

export default function App() {
  const [user, setUser]       = useState(null);
  const [page, setPage]       = useState("dashboard");
  const [surveys, setSurveys] = useState(INIT_SURVEYS);
  const [users, setUsers]     = useState(INIT_USERS);
  const [links, setLinks]     = useState(INIT_LINKS);
  const [editId, setEditId]   = useState(null);
  const [viewId, setViewId]   = useState(null);
  const [previewSurvey, setPreviewSurvey] = useState(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  useInactivity(INACTIVITY_MS, () => { if (user) setSessionExpired(true); });

  const nav = (p) => { setPage(p); setViewId(null); };
  const logout = () => { setUser(null); setPage("dashboard"); setSessionExpired(false); };

  if (!user) return <LoginPage onLogin={setUser} />;

  // Public survey response view
  if (page === "respond" && previewSurvey) return (
    <div className="min-h-screen bg-slate-950">
      <div className="sticky top-0 z-20 bg-amber-500/90 backdrop-blur text-slate-900 text-xs font-semibold px-6 py-2 flex items-center justify-between">
        <span>🔍 Preview Mode — responses won't be saved</span>
        <button onClick={() => { setPreviewSurvey(null); setPage("surveys"); }} className="font-bold hover:text-slate-700">✕ Exit Preview</button>
      </div>
      <SurveyResponsePage survey={previewSurvey} token="preview" onComplete={() => { setPreviewSurvey(null); setPage("surveys"); }} />
    </div>
  );

  // Builder page (no sidebar needed, full width)
  if (page === "builder") {
    const editing = editId ? surveys.find(s => s.id === editId) : null;
    return (
      <div className="min-h-screen bg-slate-950 flex">
        <Sidebar page={page} onNav={nav} user={user} onLogout={logout} />
        <main className="flex-1 min-h-screen overflow-y-auto">
          <SurveyBuilderPage survey={editing} onCancel={() => { setEditId(null); nav("surveys"); }}
            onSave={data => {
              if (editId) { setSurveys(p => p.map(s => s.id===editId ? {...s,...data,updatedAt:new Date().toISOString().slice(0,10)} : s)); }
              else { setSurveys(p => [...p, {id:genId(),...data,status:"draft",createdAt:new Date().toISOString().slice(0,10),responses:0,links:0}]); }
              setEditId(null); nav("surveys");
            }} />
        </main>
      </div>
    );
  }

  const viewSurvey = viewId ? surveys.find(s => s.id === viewId) : surveys[0];

  return (
    <div className="min-h-screen bg-slate-950 flex">
      <Sidebar page={page} onNav={nav} user={user} onLogout={logout} />
      <main className="flex-1 overflow-y-auto min-h-screen">
        <AnimatePresence mode="wait">
          <motion.div key={page} initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} transition={{duration:0.15}}>
            {page==="dashboard" && <DashboardPage user={user} surveys={surveys} links={links} onNav={nav} />}
            {page==="surveys"   && <SurveysPage user={user} surveys={surveys}
              onNew={() => { setEditId(null); setPage("builder"); }}
              onEdit={id => { setEditId(id); setPage("builder"); }}
              onViewAnalytics={id => { setViewId(id); nav("analytics"); }}
              onToggle={id => setSurveys(p => p.map(s => s.id===id ? {...s, status: s.status==="active" ? "paused" : s.status==="paused" ? "active" : s.status} : s))}
              onDelete={id => { if(window.confirm("Permanently delete this survey and all responses?")) { setSurveys(p => p.filter(s=>s.id!==id)); setLinks(p=>p.filter(l=>l.surveyId!==id)); }}}
            />}
            {page==="analytics" && <AnalyticsPage survey={viewSurvey} />}
            {page==="users"     && user.role==="admin" && <UsersPage users={users}
              onAdd={u => setUsers(p=>[...p,u])}
              onUpdate={(id,upd) => setUsers(p=>p.map(u=>u.id===id?{...u,...upd}:u))}
              onRemove={id => setUsers(p=>p.filter(u=>u.id!==id))}
            />}
            {page==="links" && <LinksPage user={user} surveys={surveys} links={links}
              onAdd={l => { setLinks(p=>[...p,l]); setSurveys(p=>p.map(s=>s.id===l.surveyId?{...s,links:(s.links||0)+1}:s)); }}
              onRemove={id => setLinks(p=>p.filter(l=>l.id!==id))}
              onCopy={token => { const url = `${location.origin}/survey/${token}`; navigator.clipboard.writeText(url).then(()=>toast.success("Link copied!"),()=>prompt("Copy link:",url)); }}
            />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Session timeout modal */}
      <AnimatePresence>
        {sessionExpired && (
          <Modal open title="Session Expired">
            <div className="text-center py-4">
              <div className="text-5xl mb-5">⏰</div>
              <h3 className="text-lg font-semibold text-white mb-2">You've been signed out</h3>
              <p className="text-slate-400 text-sm mb-6">For your security, you were signed out after 15 minutes of inactivity. Any in-progress responses were auto-saved.</p>
              <Btn className="w-full justify-center" onClick={logout}>Sign In Again</Btn>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}