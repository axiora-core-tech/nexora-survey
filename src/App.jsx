import { useState, useEffect, useCallback, useRef } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart,
  PolarGrid, PolarAngleAxis, Radar
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const ROLES = { ADMIN: "admin", CREATOR: "creator", MANAGER: "manager" };
const INACTIVITY_MS = 15 * 60 * 1000;

const QUESTION_TYPES = [
  { id: "radio", label: "Single Choice", desc: "One option from a list" },
  { id: "checkbox", label: "Multi-Select", desc: "One or more options" },
  { id: "rating_star", label: "Star Rating", desc: "Visual 1–5 star scale" },
  { id: "rating_number", label: "Number Scale", desc: "Custom numeric range" },
  { id: "likert", label: "Likert Scale", desc: "Agreement spectrum" },
  { id: "nps", label: "NPS Score", desc: "Net Promoter 0–10" },
  { id: "text", label: "Free Text", desc: "Open-ended answer" },
  { id: "dropdown", label: "Dropdown", desc: "Select from list" },
];

const LIKERT_OPTIONS = [
  "Strongly Agree", "Agree", "Partially Agree",
  "Neutral", "Partially Disagree", "Disagree", "Strongly Disagree"
];

const CHART_COLORS = ["#FF4500", "#FFB800", "#1E7A4A", "#0047FF", "#FF6B35", "#D63B1F", "#C8F54A"];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const genId = () => crypto.randomUUID();
const genToken = () => crypto.randomUUID().replace(/-/g, "").slice(0, 16);

function statusBadge(s) {
  const map = {
    active: "p-badge p-badge-active p-badge-pip",
    paused: "p-badge p-badge-paused p-badge-pip",
    draft: "p-badge p-badge-draft p-badge-pip",
    closed: "p-badge p-badge-closed p-badge-pip",
  };
  return map[s] || "p-badge p-badge-draft";
}

// ─── DESIGN PRIMITIVES ────────────────────────────────────────────────────────

function SurveyIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </svg>
  );
}
function BarIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 20h18M7 20V14M12 20V8M17 20V4" />
    </svg>
  );
}
function LinkIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M10 14a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 10a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}
function TeamIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function GridIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}
function PlusIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function CloseIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}
function UpIcon({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 15l7-7 7 7" />
    </svg>
  );
}
function DownIcon({ size = 12 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function Avatar({ name, size = "sm" }) {
  const initials = (name || "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  const COLORS = ["#FF4500", "#FFB800", "#1E7A4A", "#0047FF", "#D63B1F", "#FF6B35"];
  const bg = COLORS[(name || "").charCodeAt(0) % COLORS.length];
  const S = { xs: { w: 28, f: 10 }, sm: { w: 36, f: 12 }, md: { w: 44, f: 14 }, lg: { w: 56, f: 18 } };
  const s = S[size];
  return (
    <div className="p-avatar" style={{ width: s.w, height: s.w, background: bg, fontSize: s.f, letterSpacing: "0.05em" }}>
      {initials}
    </div>
  );
}

function Field({ label, required, error, dark, children }) {
  return (
    <div>
      {label && (
        <label className={`p-label${dark ? " on-dark" : ""}`}>
          {label}{required && <span style={{ color: "var(--coral)", marginLeft: 4 }}>*</span>}
        </label>
      )}
      {children}
      {error && <p className="error-txt">{error}</p>}
    </div>
  );
}

function Input({ label, value, onChange, placeholder, type = "text", required, error, dark, className = "" }) {
  return (
    <Field label={label} required={required} error={error} dark={dark}>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`p-input${dark ? " dark" : ""} ${className}`}
      />
    </Field>
  );
}

function Textarea({ label, value, onChange, placeholder, rows = 3, dark }) {
  return (
    <Field label={label} dark={dark}>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={`p-input${dark ? " dark" : ""}`}
        style={{ resize: "none" }}
      />
    </Field>
  );
}

function PSelect({ label, value, onChange, options, dark }) {
  return (
    <Field label={label} dark={dark}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`p-input${dark ? " dark" : ""}`}
        style={{ cursor: "pointer" }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </Field>
  );
}

function Toggle({ value, onChange, label, dark }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`p-toggle${value ? " on" : ""}`}
      />
      {label && (
        <span style={{
          fontFamily: "Fraunces, serif", fontSize: 14, fontWeight: 300,
          color: dark ? "rgba(253,245,232,0.6)" : "var(--espresso)",
          opacity: dark ? 1 : 0.65
        }}>
          {label}
        </span>
      )}
    </label>
  );
}

function Modal({ open, onClose, title, children, size = "md", dark }) {
  const W = { sm: 440, md: 520, lg: 680, xl: 880 };
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  if (!open) return null;
  const bg = dark ? "var(--espresso)" : "var(--warm-white)";
  const border = dark ? "rgba(253,245,232,0.1)" : "var(--blush)";
  const titleColor = dark ? "var(--cream)" : "var(--espresso)";
  return (
    <div className="p-modal-overlay" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94 }}
        transition={{ duration: 0.22, ease: [0.34, 1.56, 0.64, 1] }}
        style={{
          background: bg,
          border: `1.5px solid ${border}`,
          borderRadius: 24,
          width: "100%",
          maxWidth: W[size],
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 40px 120px rgba(22,15,8,0.3)",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "24px 32px",
          borderBottom: `1px solid ${border}`,
          flexShrink: 0,
        }}>
          <span style={{ fontFamily: "Playfair Display, serif", fontSize: 22, fontWeight: 700, color: titleColor }}>
            {title}
          </span>
          <button
            onClick={onClose}
            style={{
              width: 36, height: 36, borderRadius: 10, border: `1px solid ${border}`,
              background: "transparent", cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center",
              color: dark ? "rgba(253,245,232,0.5)" : "rgba(22,15,8,0.4)",
              transition: "all 0.2s"
            }}
          >
            <CloseIcon size={14} />
          </button>
        </div>
        <div style={{ padding: "28px 32px", overflowY: "auto" }}>{children}</div>
      </motion.div>
    </div>
  );
}

// ─── QUESTION INPUTS ──────────────────────────────────────────────────────────
function StarRating({ value = 0, onChange, max = 5 }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {Array.from({ length: max }, (_, i) => i + 1).map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          className={`star-btn${(hover || value) >= n ? " filled" : ""}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function NpsInput({ value, onChange }) {
  return (
    <div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {Array.from({ length: 11 }, (_, i) => i).map(n => {
          const cls = value === n
            ? n <= 6 ? "nps-btn selected-detractor" : n <= 8 ? "nps-btn selected-passive" : "nps-btn selected-promoter"
            : "nps-btn";
          return <button key={n} type="button" onClick={() => onChange(n)} className={cls}>{n}</button>;
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontFamily: "Syne, sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", opacity: 0.4 }}>
        <span>0 — NOT LIKELY</span><span>10 — VERY LIKELY</span>
      </div>
    </div>
  );
}

function QuestionInput({ question: q, value, onChange }) {
  if (q.type === "text")
    return (
      <textarea
        value={value || ""}
        onChange={e => onChange(e.target.value)}
        rows={4}
        placeholder="Share your thoughts…"
        className="p-input"
        style={{ resize: "none" }}
      />
    );

  if (q.type === "rating_star") return <StarRating value={value || 0} onChange={onChange} />;
  if (q.type === "nps") return <NpsInput value={value} onChange={onChange} />;

  if (q.type === "rating_number") {
    const min = q.settings?.min || 1, max = q.settings?.max || 10;
    return (
      <div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {Array.from({ length: max - min + 1 }, (_, i) => i + min).map(n => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              style={{
                width: 44, height: 44, borderRadius: 12,
                border: `1.5px solid ${value === n ? "var(--coral)" : "var(--blush)"}`,
                background: value === n ? "var(--coral)" : "var(--warm-white)",
                color: value === n ? "#fff" : "var(--espresso)",
                fontFamily: "Syne, sans-serif", fontSize: 13, fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.2s cubic-bezier(0.34,1.56,0.64,1)"
              }}
            >{n}</button>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontFamily: "Syne, sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", opacity: 0.4 }}>
          <span>{min} — LOWEST</span><span>{max} — HIGHEST</span>
        </div>
      </div>
    );
  }

  if (q.type === "radio" || q.type === "likert")
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {q.options.map(opt => (
          <label key={opt} className={`opt-card${value === opt ? " selected" : ""}`} onClick={() => onChange(opt)}>
            <div className="opt-radio" />
            <span>{opt}</span>
          </label>
        ))}
      </div>
    );

  if (q.type === "checkbox")
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {q.options.map(opt => {
          const checked = Array.isArray(value) && value.includes(opt);
          return (
            <label
              key={opt}
              className={`opt-card${checked ? " selected" : ""}`}
              onClick={() => {
                const c = Array.isArray(value) ? value : [];
                onChange(checked ? c.filter(v => v !== opt) : [...c, opt]);
              }}
            >
              <div className="opt-check" />
              <span>{opt}</span>
            </label>
          );
        })}
      </div>
    );

  if (q.type === "dropdown")
    return (
      <select
        value={value || ""}
        onChange={e => onChange(e.target.value)}
        className="p-input"
        style={{ cursor: "pointer" }}
      >
        <option value="">— Select an option —</option>
        {q.options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    );

  return <p style={{ opacity: 0.4, fontSize: 13 }}>Unsupported question type</p>;
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
const NAV = [
  { id: "dashboard", label: "Overview", icon: GridIcon },
  { id: "surveys", label: "Surveys", icon: SurveyIcon },
  { id: "links", label: "Links", icon: LinkIcon },
  { id: "analytics", label: "Analytics", icon: BarIcon },
  { id: "users", label: "Team", icon: TeamIcon, adminOnly: true },
];

function Sidebar({ page, onNav, user, onLogout }) {
  return (
    <aside className="sidebar" style={{ position: "relative", zIndex: 10 }}>
      <div className="grain" />
      {/* Logo */}
      <div style={{ padding: "32px 24px 28px", borderBottom: "1px solid rgba(253,245,232,0.07)", position: "relative", zIndex: 2 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 0 }}>
          <div>
            <span style={{
              fontFamily: "Syne, sans-serif", fontSize: 8, fontWeight: 700,
              letterSpacing: "0.2em", textTransform: "uppercase",
              color: "rgba(253,245,232,0.3)", display: "block", marginBottom: 2
            }}>Nexora</span>
            <span style={{
              fontFamily: "Playfair Display, serif", fontSize: 26, fontWeight: 900,
              letterSpacing: "-1px", color: "var(--cream)", lineHeight: 1
            }}>Pulse</span>
          </div>
          <div className="sonar-dot" style={{ position: "relative", width: 9, height: 9, background: "var(--coral)", borderRadius: "50%", boxShadow: "0 0 10px rgba(255,69,0,.55)", marginLeft: 8, marginTop: 14, flexShrink: 0 }}>
            <div className="sonar-ring" style={{ width: 9, height: 9 }} />
            <div className="sonar-ring" style={{ width: 9, height: 9 }} />
            <div className="sonar-ring" style={{ width: 9, height: 9 }} />
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "16px 12px", overflowY: "auto", position: "relative", zIndex: 2 }}>
        {NAV.filter(n => !n.adminOnly || user?.role === "admin").map(n => {
          const Icon = n.icon;
          return (
            <button
              key={n.id}
              onClick={() => onNav(n.id)}
              className={`nav-item${page === n.id ? " active" : ""}`}
            >
              <Icon size={15} />
              {n.label}
            </button>
          );
        })}
      </nav>

      {/* User */}
      <div style={{ padding: "16px 12px 20px", borderTop: "1px solid rgba(253,245,232,0.07)", position: "relative", zIndex: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", marginBottom: 6 }}>
          <Avatar name={user?.name || "?"} size="sm" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "Syne, sans-serif", fontSize: 12, fontWeight: 600, color: "var(--cream)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user?.name}</div>
            <div style={{ fontFamily: "Syne, sans-serif", fontSize: 9, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(253,245,232,0.35)", marginTop: 2 }}>{user?.role}</div>
          </div>
        </div>
        <button
          onClick={onLogout}
          style={{
            width: "100%", padding: "10px 12px", borderRadius: 12, border: "none",
            background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
            fontFamily: "Syne, sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase",
            color: "rgba(253,245,232,0.3)", transition: "all 0.2s"
          }}
          onMouseEnter={e => { e.currentTarget.style.color = "var(--terracotta)"; e.currentTarget.style.background = "rgba(214,59,31,0.1)"; }}
          onMouseLeave={e => { e.currentTarget.style.color = "rgba(253,245,232,0.3)"; e.currentTarget.style.background = "transparent"; }}
        >
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
          Sign Out
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
    { label: "Admin", email: "admin@nexora.io", role: "Full control" },
    { label: "Creator", email: "creator@nexora.io", role: "Build & manage" },
    { label: "Manager", email: "manager@nexora.io", role: "View & analyze" },
  ];

  const doLogin = async (loginEmail) => {
    setLoading(true); setError("");
    await new Promise(r => setTimeout(r, 700));
    const roleMap = { "admin@nexora.io": "admin", "creator@nexora.io": "creator", "manager@nexora.io": "manager" };
    const e = loginEmail || email;
    const role = roleMap[e] || "manager";
    onLogin({ id: genId(), email: e, name: e.split("@")[0].replace(/^\w/, c => c.toUpperCase()), role });
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--espresso)", display: "flex", overflow: "hidden", position: "relative" }}>
      {/* Mesh BG */}
      <div className="mesh-bg">
        <div className="mb mb1" />
        <div className="mb mb2" />
        <div className="grain" />
      </div>

      {/* Left Panel */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "80px 80px", position: "relative", zIndex: 2 }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 0, marginBottom: 80 }}>
          <div>
            <span style={{ fontFamily: "Syne, sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(253,245,232,0.3)", display: "block", marginBottom: 3 }}>Nexora</span>
            <span style={{ fontFamily: "Playfair Display, serif", fontSize: 32, fontWeight: 900, letterSpacing: "-1.5px", color: "var(--cream)", lineHeight: 1 }}>Pulse</span>
          </div>
          <div className="sonar-dot" style={{ position: "relative", width: 10, height: 10, background: "var(--coral)", borderRadius: "50%", marginLeft: 10, marginTop: 16 }}>
            <div className="sonar-ring" style={{ width: 10, height: 10 }} />
            <div className="sonar-ring" style={{ width: 10, height: 10 }} />
          </div>
        </div>

        <div className="sec-tag on-dark rise-1">Survey Science Platform</div>

        <h1 style={{
          fontFamily: "Playfair Display, serif",
          fontSize: "clamp(52px, 5vw, 84px)",
          fontWeight: 900,
          lineHeight: 0.95,
          letterSpacing: "-3px",
          color: "var(--cream)",
          marginBottom: 28,
        }} className="rise-2">
          Turn feedback<br />into <em style={{ fontStyle: "italic", color: "var(--saffron)" }}>decisions</em>
        </h1>

        <p style={{ fontFamily: "Fraunces, serif", fontSize: 18, fontWeight: 300, lineHeight: 1.7, color: "rgba(253,245,232,0.5)", maxWidth: 420, marginBottom: 60 }} className="rise-3">
          Market research tools built for people who take insight seriously. Beautiful surveys, real intelligence.
        </p>

        {/* Feature chips */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }} className="rise-4">
          {[
            ["AI-powered deep insights", "var(--coral)"],
            ["Real-time response tracking", "var(--saffron)"],
            ["Enterprise-grade security", "var(--sage)"],
          ].map(([text, color]) => (
            <div key={text} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
              <span style={{ fontFamily: "Syne, sans-serif", fontSize: 12, fontWeight: 500, letterSpacing: "0.06em", color: "rgba(253,245,232,0.5)" }}>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel */}
      <div style={{ width: 480, display: "flex", alignItems: "center", justifyContent: "center", padding: 48, position: "relative", zIndex: 2 }}>
        <motion.div
          initial={{ opacity: 0, x: 32 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
          style={{
            background: "rgba(253,245,232,0.04)",
            border: "1px solid rgba(253,245,232,0.1)",
            borderRadius: 28,
            padding: 48,
            width: "100%",
            backdropFilter: "blur(20px)",
          }}
        >
          <div style={{ marginBottom: 40 }}>
            <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: 32, fontWeight: 700, color: "var(--cream)", letterSpacing: "-1px", marginBottom: 8 }}>
              Welcome back
            </h2>
            <p style={{ fontFamily: "Fraunces, serif", fontSize: 15, fontWeight: 300, color: "rgba(253,245,232,0.45)" }}>
              Sign in to your workspace
            </p>
          </div>

          <form onSubmit={e => { e.preventDefault(); doLogin(); }} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <Input label="Work Email" type="email" value={email} onChange={setEmail} placeholder="you@company.com" required dark />
            <Input label="Password" type="password" value={pw} onChange={setPw} placeholder="••••••••" required dark />

            {error && (
              <div style={{ background: "rgba(214,59,31,0.15)", border: "1px solid rgba(214,59,31,0.3)", borderRadius: 12, padding: "12px 16px", fontFamily: "Syne, sans-serif", fontSize: 12, color: "#fca5a5" }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-fire" style={{ width: "100%", justifyContent: "center", marginTop: 4 }}>
              <span>{loading ? "Signing in…" : "Enter Workspace"}</span>
              {!loading && (
                <div style={{ width: 22, height: 22, border: "1.5px solid rgba(255,255,255,0.4)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </div>
              )}
            </button>
          </form>

          {/* Demo accounts */}
          <div style={{ marginTop: 36, paddingTop: 28, borderTop: "1px solid rgba(253,245,232,0.08)" }}>
            <p style={{ fontFamily: "Syne, sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(253,245,232,0.25)", textAlign: "center", marginBottom: 16 }}>
              Demo Accounts
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {demos.map(d => (
                <button
                  key={d.label}
                  onClick={() => doLogin(d.email)}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                    padding: "14px 8px", borderRadius: 14,
                    background: "rgba(253,245,232,0.04)", border: "1px solid rgba(253,245,232,0.08)",
                    cursor: "pointer", transition: "all 0.25s ease"
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,69,0,0.4)"; e.currentTarget.style.background = "rgba(255,69,0,0.08)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(253,245,232,0.08)"; e.currentTarget.style.background = "rgba(253,245,232,0.04)"; }}
                >
                  <span style={{ fontFamily: "Syne, sans-serif", fontSize: 12, fontWeight: 700, color: "var(--cream)" }}>{d.label}</span>
                  <span style={{ fontFamily: "Fraunces, serif", fontSize: 11, fontWeight: 300, color: "rgba(253,245,232,0.35)" }}>{d.role}</span>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ─── PAGE WRAPPER ─────────────────────────────────────────────────────────────
function PageWrap({ children }) {
  return (
    <div style={{ background: "var(--espresso)", minHeight: "100vh", padding: "48px 48px 80px", position: "relative" }}>
      <div className="grain" style={{ opacity: 0.025 }} />
      <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative", zIndex: 2 }}>
        {children}
      </div>
    </div>
  );
}

function PageHeader({ tag, title, sub, action }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 48, gap: 24, flexWrap: "wrap" }}>
      <div>
        <div className="sec-tag on-dark">{tag}</div>
        <h1 className="h-display on-dark" style={{ fontSize: "clamp(36px, 3.5vw, 52px)", letterSpacing: "-2px", marginBottom: sub ? 10 : 0 }}>
          {title}
        </h1>
        {sub && <p style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 300, color: "rgba(253,245,232,0.45)", lineHeight: 1.6 }}>{sub}</p>}
      </div>
      {action}
    </div>
  );
}

// ─── DASHBOARD ─────────────────────────────────────────────────────────────────
function DashboardPage({ user, surveys, links, onNav }) {
  const totalResponses = surveys.reduce((a, s) => a + (s.responses || 0), 0);
  const activeLinks = links.filter(l => l.status === "active").length;

  const weekData = [
    { day: "Mon", r: 34 }, { day: "Tue", r: 52 }, { day: "Wed", r: 41 },
    { day: "Thu", r: 68 }, { day: "Fri", r: 45 }, { day: "Sat", r: 12 }, { day: "Sun", r: 8 }
  ];
  const distData = [
    { name: "Very Satisfied", v: 38 }, { name: "Satisfied", v: 42 },
    { name: "Neutral", v: 12 }, { name: "Dissatisfied", v: 6 }, { name: "Very Dissatisfied", v: 2 }
  ];

  const stats = [
    { lbl: "Total Surveys", val: surveys.length, delta: 8, up: true },
    { lbl: "Total Responses", val: totalResponses.toLocaleString(), delta: 23, up: true },
    { lbl: "Active Links", val: activeLinks, delta: 5, up: false },
    { lbl: "Avg. Completion", val: "87%", delta: 4, up: true },
  ];

  return (
    <PageWrap>
      <PageHeader
        tag="Command Centre"
        title={<>Good to see you,<br /><em style={{ fontStyle: "italic", color: "var(--coral)" }}>{user?.name?.split(" ")[0]}</em></>}
        sub="Here's everything happening across your research universe."
      />

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 40 }}>
        {stats.map((s, i) => (
          <motion.div key={s.lbl} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <div className="stat-card">
              <div className="stat-lbl">{s.lbl}</div>
              <div className="stat-val">{s.val}</div>
              <div className={`stat-delta ${s.up ? "up" : "dn"}`}>
                <span>{s.up ? "▲" : "▼"}</span>
                <span>{s.delta}% vs last month</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 20, marginBottom: 40 }}>
        <div className="p-card-dark" style={{ padding: 32 }}>
          <div style={{ fontFamily: "Syne, sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(253,245,232,0.4)", marginBottom: 28 }}>
            Responses This Week
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weekData} barSize={28}>
              <defs>
                <linearGradient id="cg1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FF4500" />
                  <stop offset="100%" stopColor="#FFB800" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(253,245,232,0.05)" vertical={false} />
              <XAxis dataKey="day" stroke="transparent" tick={{ fontFamily: "Syne, sans-serif", fontSize: 10, fill: "rgba(253,245,232,0.3)", fontWeight: 600, letterSpacing: "0.1em" }} axisLine={false} tickLine={false} />
              <YAxis stroke="transparent" tick={{ fontFamily: "Syne, sans-serif", fontSize: 10, fill: "rgba(253,245,232,0.3)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "var(--espresso-mid)", border: "1px solid rgba(253,245,232,0.1)", borderRadius: 12, fontFamily: "Fraunces, serif", color: "var(--cream)" }} cursor={{ fill: "rgba(255,69,0,0.05)" }} />
              <Bar dataKey="r" fill="url(#cg1)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="p-card-dark" style={{ padding: 32 }}>
          <div style={{ fontFamily: "Syne, sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(253,245,232,0.4)", marginBottom: 28 }}>
            Satisfaction
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={distData} dataKey="v" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={50} paddingAngle={3}>
                {distData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "var(--espresso-mid)", border: "1px solid rgba(253,245,232,0.1)", borderRadius: 12, fontFamily: "Fraunces, serif", color: "var(--cream)" }} />
              <Legend wrapperStyle={{ fontFamily: "Syne, sans-serif", fontSize: 10, color: "rgba(253,245,232,0.4)" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent surveys */}
      <div className="p-card-dark" style={{ overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "24px 28px", borderBottom: "1px solid rgba(253,245,232,0.06)" }}>
          <span style={{ fontFamily: "Syne, sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(253,245,232,0.4)" }}>Recent Surveys</span>
          <button onClick={() => onNav("surveys")} className="btn-ghost" style={{ color: "var(--saffron)", opacity: 1, fontSize: 11, letterSpacing: "0.1em" }}>View all →</button>
        </div>
        {surveys.slice(0, 5).map(s => (
          <div key={s.id} style={{
            display: "flex", alignItems: "center", gap: 16, padding: "18px 28px",
            borderBottom: "1px solid rgba(253,245,232,0.04)",
            transition: "background 0.2s"
          }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,69,0,0.04)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,69,0,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <SurveyIcon size={15} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "Fraunces, serif", fontSize: 14, fontWeight: 400, color: "rgba(253,245,232,0.8)", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.title}</div>
              <div style={{ fontFamily: "Syne, sans-serif", fontSize: 10, fontWeight: 600, color: "rgba(253,245,232,0.3)", letterSpacing: "0.08em" }}>{s.responses || 0} responses · {s.links || 0} links</div>
            </div>
            <span className={statusBadge(s.status)}>{s.status}</span>
          </div>
        ))}
      </div>
    </PageWrap>
  );
}

// ─── SURVEYS LIST ──────────────────────────────────────────────────────────────
function SurveysPage({ user, surveys, onNew, onEdit, onViewAnalytics, onToggle, onDelete }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const canEdit = ["admin", "creator"].includes(user?.role);

  const filtered = surveys.filter(s =>
    s.title.toLowerCase().includes(q.toLowerCase()) &&
    (filter === "all" || s.status === filter)
  );

  return (
    <PageWrap>
      <PageHeader
        tag="Research Library"
        title="Surveys"
        sub={`${surveys.length} surveys in your workspace`}
        action={canEdit && (
          <button onClick={onNew} className="btn-fire">
            <span><PlusIcon size={14} /></span>
            <span>New Survey</span>
          </button>
        )}
      />

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, marginBottom: 32, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative" }}>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search surveys…"
            className="p-input dark"
            style={{ width: 220, paddingLeft: 40, fontSize: 13 }}
          />
          <svg style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", opacity: 0.3 }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
        </div>
        {["all", "active", "paused", "draft", "closed"].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "8px 18px", borderRadius: 100,
              fontFamily: "Syne, sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "capitalize",
              border: "1px solid",
              borderColor: filter === f ? "var(--coral)" : "rgba(253,245,232,0.12)",
              background: filter === f ? "rgba(255,69,0,0.15)" : "transparent",
              color: filter === f ? "var(--coral)" : "rgba(253,245,232,0.4)",
              cursor: "pointer", transition: "all 0.2s"
            }}
          >{f}</button>
        ))}
      </div>

      {/* Survey cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filtered.map((s, i) => {
          const totalQ = s.sections?.reduce((a, sec) => a + sec.questions.length, 0) || 0;
          return (
            <motion.div key={s.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <div
                className="p-card-dark"
                style={{ padding: "24px 28px", display: "flex", alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
                    <h3 style={{ fontFamily: "Playfair Display, serif", fontSize: 18, fontWeight: 700, color: "var(--cream)", letterSpacing: "-0.5px" }}>{s.title}</h3>
                    <span className={statusBadge(s.status)}>{s.status}</span>
                  </div>
                  <p style={{ fontFamily: "Fraunces, serif", fontSize: 13, fontWeight: 300, color: "rgba(253,245,232,0.4)", marginBottom: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.description}</p>
                  <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                    {[
                      [`${s.sections?.length || 0} sections, ${totalQ} questions`, SurveyIcon],
                      [`${s.responses || 0} responses`, BarIcon],
                      [`${s.links || 0} links`, LinkIcon],
                    ].map(([text, Icon]) => (
                      <div key={text} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ opacity: 0.3, color: "var(--cream)" }}><Icon size={12} /></span>
                        <span style={{ fontFamily: "Syne, sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", color: "rgba(253,245,232,0.35)" }}>{text}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap", alignItems: "center" }}>
                  <button onClick={() => onViewAnalytics(s.id)} className="btn-outline-cream" style={{ fontSize: 10, padding: "10px 18px" }}>Analytics</button>
                  {canEdit && (
                    <>
                      <button onClick={() => onEdit(s.id)} className="btn-outline-cream" style={{ fontSize: 10, padding: "10px 18px" }}>Edit</button>
                      <button
                        onClick={() => onToggle(s.id)}
                        style={{
                          padding: "10px 18px", borderRadius: 100,
                          fontFamily: "Syne, sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
                          border: `1px solid ${s.status === "active" ? "rgba(255,184,0,0.3)" : "rgba(30,122,74,0.3)"}`,
                          background: s.status === "active" ? "rgba(255,184,0,0.1)" : "rgba(30,122,74,0.1)",
                          color: s.status === "active" ? "var(--saffron)" : "#4ade80",
                          cursor: "pointer", transition: "all 0.2s"
                        }}
                      >
                        {s.status === "active" ? "Pause" : "Resume"}
                      </button>
                      {user?.role === "admin" && (
                        <button
                          onClick={() => onDelete(s.id)}
                          style={{
                            width: 36, height: 36, borderRadius: 10, border: "1px solid rgba(214,59,31,0.25)",
                            background: "rgba(214,59,31,0.08)", cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            color: "var(--terracotta)", transition: "all 0.2s"
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = "rgba(214,59,31,0.2)"; e.currentTarget.style.borderColor = "rgba(214,59,31,0.5)"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "rgba(214,59,31,0.08)"; e.currentTarget.style.borderColor = "rgba(214,59,31,0.25)"; }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2" />
                          </svg>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ fontFamily: "Playfair Display, serif", fontSize: 48, fontWeight: 900, color: "rgba(253,245,232,0.08)", letterSpacing: "-3px", marginBottom: 20 }}>Empty</div>
            <p style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 300, color: "rgba(253,245,232,0.3)" }}>No surveys match your search</p>
          </div>
        )}
      </div>
    </PageWrap>
  );
}

// ─── SURVEY BUILDER ────────────────────────────────────────────────────────────
function QuestionCard({ q, idx, total, onUpdate, onDelete, onMove }) {
  const [open, setOpen] = useState(true);
  const type = QUESTION_TYPES.find(t => t.id === q.type);

  const addOpt = () => onUpdate({ options: [...(q.options || []), `Option ${(q.options || []).length + 1}`] });
  const updOpt = (i, v) => onUpdate({ options: q.options.map((o, oi) => oi === i ? v : o) });
  const delOpt = (i) => onUpdate({ options: q.options.filter((_, oi) => oi !== i) });

  return (
    <div
      className="p-card"
      style={{ background: open ? "#fff" : "var(--warm-white)", borderColor: open ? "var(--blush)" : "transparent" }}
    >
      <div
        style={{ display: "flex", alignItems: "center", gap: 12, padding: "18px 22px", cursor: "pointer" }}
        onClick={() => setOpen(p => !p)}
      >
        <div style={{
          width: 28, height: 28, borderRadius: 8, background: "rgba(255,69,0,0.1)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          fontFamily: "Syne, sans-serif", fontSize: 11, fontWeight: 700, color: "var(--coral)"
        }}>{idx + 1}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "Fraunces, serif", fontSize: 14, fontWeight: 400, color: "var(--espresso)", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {q.text || <span style={{ fontStyle: "italic", opacity: 0.3 }}>Untitled question</span>}
          </div>
          <div style={{ fontFamily: "Syne, sans-serif", fontSize: 9, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--coral)", opacity: 0.7 }}>
            {type?.label}{q.required ? " · Required" : ""}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }} onClick={e => e.stopPropagation()}>
          <button onClick={() => onMove(-1)} disabled={idx === 0} style={{ padding: 6, background: "none", border: "none", cursor: "pointer", opacity: idx === 0 ? 0.2 : 0.5, color: "var(--espresso)", transition: "opacity 0.2s" }}>
            <UpIcon />
          </button>
          <button onClick={() => onMove(1)} disabled={idx === total - 1} style={{ padding: 6, background: "none", border: "none", cursor: "pointer", opacity: idx === total - 1 ? 0.2 : 0.5, color: "var(--espresso)", transition: "opacity 0.2s" }}>
            <DownIcon />
          </button>
          <button onClick={onDelete} style={{ padding: 6, background: "none", border: "none", cursor: "pointer", color: "var(--terracotta)", opacity: 0.5, transition: "opacity 0.2s" }} onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0.5}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /></svg>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
            <div style={{ padding: "4px 22px 22px", borderTop: "1px solid var(--blush)", display: "flex", flexDirection: "column", gap: 16, marginTop: 4 }}>
              <Textarea label="Question Text" value={q.text} onChange={v => onUpdate({ text: v })} placeholder="Enter your question here…" rows={2} />
              {["radio", "checkbox", "dropdown"].includes(q.type) && (
                <div>
                  <label className="p-label">Answer Options</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {(q.options || []).map((o, i) => (
                      <div key={i} style={{ display: "flex", gap: 8 }}>
                        <input
                          value={o}
                          onChange={e => updOpt(i, e.target.value)}
                          placeholder={`Option ${i + 1}`}
                          className="p-input"
                          style={{ fontSize: 13 }}
                        />
                        <button onClick={() => delOpt(i)} style={{ padding: "0 10px", background: "none", border: "none", cursor: "pointer", color: "var(--terracotta)", opacity: 0.4, fontSize: 16, transition: "opacity 0.2s" }} onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0.4}>×</button>
                      </div>
                    ))}
                    <button onClick={addOpt} style={{ fontFamily: "Syne, sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "var(--coral)", background: "none", border: "none", cursor: "pointer", textAlign: "left", opacity: 0.7, padding: "4px 0", transition: "opacity 0.2s" }} onMouseEnter={e => e.currentTarget.style.opacity = 1} onMouseLeave={e => e.currentTarget.style.opacity = 0.7}>
                      + ADD OPTION
                    </button>
                  </div>
                </div>
              )}
              {q.type === "rating_number" && (
                <div style={{ display: "flex", gap: 12 }}>
                  <Input label="Min" type="number" value={q.settings?.min || 1} onChange={v => onUpdate({ settings: { ...q.settings, min: Number(v) } })} />
                  <Input label="Max" type="number" value={q.settings?.max || 10} onChange={v => onUpdate({ settings: { ...q.settings, max: Number(v) } })} />
                </div>
              )}
              {q.type === "likert" && (
                <div>
                  <label className="p-label">Scale Options (Default)</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {LIKERT_OPTIONS.map(o => (
                      <span key={o} style={{ padding: "6px 12px", background: "var(--blush)", borderRadius: 100, fontFamily: "Syne, sans-serif", fontSize: 10, fontWeight: 600, color: "var(--espresso)", opacity: 0.65 }}>{o}</span>
                    ))}
                  </div>
                </div>
              )}
              <Toggle value={q.required} onChange={v => onUpdate({ required: v })} label="Required question" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SurveyBuilderPage({ survey, onSave, onCancel }) {
  const [title, setTitle] = useState(survey?.title || "");
  const [desc, setDesc] = useState(survey?.description || "");
  const [sections, setSections] = useState(survey?.sections || [{ id: genId(), title: "Section 1", questions: [] }]);
  const [activeSec, setActiveSec] = useState(0);
  const [typeModal, setTypeModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const sec = sections[activeSec];
  const addSection = () => { setSections(p => [...p, { id: genId(), title: `Section ${p.length + 1}`, questions: [] }]); setActiveSec(sections.length); };
  const updateSecTitle = (i, t) => setSections(p => p.map((s, si) => si === i ? { ...s, title: t } : s));

  const addQ = (type) => {
    const q = {
      id: genId(), type, text: "", required: true,
      options: type === "likert" ? [...LIKERT_OPTIONS] : ["radio", "checkbox", "dropdown"].includes(type) ? ["Option 1", "Option 2", "Option 3"] : [],
      settings: type === "rating_number" ? { min: 1, max: 10 } : {}
    };
    setSections(p => p.map((s, i) => i === activeSec ? { ...s, questions: [...s.questions, q] } : s));
    setTypeModal(false);
  };
  const updQ = (qId, upd) => setSections(p => p.map((s, i) => i === activeSec ? { ...s, questions: s.questions.map(q => q.id === qId ? { ...q, ...upd } : q) } : s));
  const delQ = (qId) => setSections(p => p.map((s, i) => i === activeSec ? { ...s, questions: s.questions.filter(q => q.id !== qId) } : s));
  const moveQ = (qId, dir) => {
    const qs = [...sec.questions]; const i = qs.findIndex(q => q.id === qId);
    if (i + dir < 0 || i + dir >= qs.length) return;
    [qs[i], qs[i + dir]] = [qs[i + dir], qs[i]];
    setSections(p => p.map((s, si) => si === activeSec ? { ...s, questions: qs } : s));
  };

  const totalQ = sections.reduce((a, s) => a + s.questions.length, 0);

  return (
    <PageWrap>
      <PageHeader
        tag={survey ? "Editing Survey" : "New Survey"}
        title={survey ? survey.title || "Untitled" : "Build something great"}
        sub={`${totalQ} questions across ${sections.length} section${sections.length !== 1 ? "s" : ""}`}
        action={
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onCancel} className="btn-outline-cream">Cancel</button>
            <button
              onClick={() => { setSaving(true); setTimeout(() => { onSave({ title, description: desc, sections }); setSaving(false); }, 600); }}
              disabled={!title || saving}
              className="btn-fire"
            >
              <span>{saving ? "Saving…" : "Save Survey"}</span>
            </button>
          </div>
        }
      />

      {/* Survey metadata */}
      <div className="p-card-dark" style={{ padding: 32, marginBottom: 24, display: "flex", flexDirection: "column", gap: 18 }}>
        <Input label="Survey Title" value={title} onChange={setTitle} placeholder="e.g. Employee Satisfaction Q4 2024" required dark />
        <Textarea label="Description" value={desc} onChange={setDesc} placeholder="Brief description…" rows={2} dark />
      </div>

      {/* Section tabs */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 20 }}>
        {sections.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setActiveSec(i)}
            style={{
              padding: "10px 20px", borderRadius: 100,
              fontFamily: "Syne, sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
              border: "1px solid",
              borderColor: activeSec === i ? "var(--coral)" : "rgba(253,245,232,0.12)",
              background: activeSec === i ? "rgba(255,69,0,0.15)" : "transparent",
              color: activeSec === i ? "var(--coral)" : "rgba(253,245,232,0.4)",
              cursor: "pointer", transition: "all 0.2s"
            }}
          >
            {s.title} <span style={{ opacity: 0.5 }}>({s.questions.length})</span>
          </button>
        ))}
        <button
          onClick={addSection}
          style={{
            padding: "10px 20px", borderRadius: 100,
            fontFamily: "Syne, sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
            border: "1.5px dashed rgba(253,245,232,0.15)",
            background: "transparent", color: "rgba(253,245,232,0.3)",
            cursor: "pointer", transition: "all 0.2s"
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,69,0,0.4)"; e.currentTarget.style.color = "var(--coral)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(253,245,232,0.15)"; e.currentTarget.style.color = "rgba(253,245,232,0.3)"; }}
        >
          + Add Section
        </button>
      </div>

      {/* Questions */}
      <div className="p-card-dark" style={{ padding: 28 }}>
        <div style={{ marginBottom: 20 }}>
          <Input label="Section Title" value={sec?.title || ""} onChange={v => updateSecTitle(activeSec, v)} placeholder="Section title" dark />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {sec?.questions?.map((q, qi) => (
            <QuestionCard key={q.id} q={q} idx={qi} total={sec.questions.length}
              onUpdate={upd => updQ(q.id, upd)} onDelete={() => delQ(q.id)} onMove={dir => moveQ(q.id, dir)} />
          ))}
        </div>
        <button
          onClick={() => setTypeModal(true)}
          style={{
            width: "100%", marginTop: sec?.questions?.length ? 16 : 0,
            padding: "22px", borderRadius: 16,
            border: "1.5px dashed rgba(253,245,232,0.15)",
            background: "transparent", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            fontFamily: "Syne, sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
            color: "rgba(253,245,232,0.3)", transition: "all 0.3s"
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,69,0,0.4)"; e.currentTarget.style.color = "var(--coral)"; e.currentTarget.style.background = "rgba(255,69,0,0.04)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(253,245,232,0.15)"; e.currentTarget.style.color = "rgba(253,245,232,0.3)"; e.currentTarget.style.background = "transparent"; }}
        >
          <PlusIcon size={16} />
          Add Question
        </button>
      </div>

      <AnimatePresence>
        {typeModal && (
          <Modal open title="Select Question Type" onClose={() => setTypeModal(false)} size="lg" dark>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {QUESTION_TYPES.map(qt => (
                <button
                  key={qt.id}
                  onClick={() => addQ(qt.id)}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6,
                    padding: "20px 22px", borderRadius: 16,
                    background: "rgba(253,245,232,0.04)", border: "1px solid rgba(253,245,232,0.08)",
                    cursor: "pointer", transition: "all 0.25s cubic-bezier(0.34,1.56,0.64,1)", textAlign: "left"
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,69,0,0.4)"; e.currentTarget.style.background = "rgba(255,69,0,0.08)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(253,245,232,0.08)"; e.currentTarget.style.background = "rgba(253,245,232,0.04)"; e.currentTarget.style.transform = "none"; }}
                >
                  <span style={{ fontFamily: "Playfair Display, serif", fontSize: 16, fontWeight: 700, color: "var(--cream)" }}>{qt.label}</span>
                  <span style={{ fontFamily: "Fraunces, serif", fontSize: 13, fontWeight: 300, color: "rgba(253,245,232,0.4)" }}>{qt.desc}</span>
                </button>
              ))}
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </PageWrap>
  );
}

// ─── SURVEY RESPONSE PAGE ─────────────────────────────────────────────────────
function SurveyResponsePage({ survey, token, onComplete }) {
  const totalQ = survey?.sections?.reduce((a, s) => a + s.questions.length, 0) || 0;
  const [secIdx, setSecIdx] = useState(0);
  const [answers, setAnswers] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`draft_${token}`) || "{}"); } catch { return {}; }
  });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const n = Object.keys(answers).length;
    if (n > 0 && n % 3 === 0) localStorage.setItem(`draft_${token}`, JSON.stringify(answers));
  }, [answers, token]);

  if (!survey) return (
    <div style={{ minHeight: "100vh", background: "var(--espresso)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: "Playfair Display, serif", fontSize: 80, fontWeight: 900, color: "rgba(253,245,232,0.06)", letterSpacing: "-5px", marginBottom: 24 }}>404</div>
        <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: 32, fontWeight: 700, color: "var(--cream)", marginBottom: 12 }}>Survey Not Found</h2>
        <p style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 300, color: "rgba(253,245,232,0.4)" }}>This link may be invalid or expired.</p>
      </div>
    </div>
  );

  if (submitted) return (
    <div style={{ minHeight: "100vh", background: "var(--cream)", display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ textAlign: "center", maxWidth: 480 }}>
        <div style={{ width: 100, height: 100, borderRadius: "50%", background: "var(--sage)", margin: "0 auto 36px", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 24px 60px rgba(30,122,74,0.3)" }}>
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
        </div>
        <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: 44, fontWeight: 900, color: "var(--espresso)", letterSpacing: "-2px", marginBottom: 14 }}>All done!</h2>
        <p style={{ fontFamily: "Fraunces, serif", fontSize: 18, fontWeight: 300, color: "rgba(22,15,8,0.5)", lineHeight: 1.6 }}>Your responses have been recorded. Thank you for your time.</p>
        {onComplete && <button onClick={onComplete} className="btn-espresso" style={{ marginTop: 36 }}>← Back</button>}
      </motion.div>
    </div>
  );

  const secs = survey.sections || [];
  const sec = secs[secIdx];
  const answered = Object.keys(answers).length;
  const pct = totalQ > 0 ? Math.round((answered / totalQ) * 100) : 0;
  const isLast = secIdx === secs.length - 1;
  const canNext = sec?.questions?.filter(q => q.required).every(q => {
    const v = answers[q.id];
    return v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0);
  });

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)" }}>
      {/* Header */}
      <div style={{
        background: "rgba(253,245,232,0.9)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--blush)", position: "sticky", top: 0, zIndex: 10
      }}>
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "18px 32px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div>
              <div style={{ fontFamily: "Playfair Display, serif", fontSize: 16, fontWeight: 700, color: "var(--espresso)", letterSpacing: "-0.5px" }}>{survey.title}</div>
              <div style={{ fontFamily: "Syne, sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--coral)", marginTop: 2 }}>
                Section {secIdx + 1} of {secs.length}: {sec?.title}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "Playfair Display, serif", fontSize: 24, fontWeight: 900, color: "var(--coral)", lineHeight: 1 }}>{pct}%</div>
              <div style={{ fontFamily: "Syne, sans-serif", fontSize: 9, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(22,15,8,0.35)" }}>{answered}/{totalQ} answered</div>
            </div>
          </div>
          <div style={{ height: 4, background: "var(--blush)", borderRadius: 10, overflow: "hidden" }}>
            <motion.div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      {/* Questions */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "52px 32px" }}>
        <AnimatePresence mode="wait">
          <motion.div key={secIdx} initial={{ opacity: 0, x: 32 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -32 }} transition={{ duration: 0.3 }} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: 28, fontWeight: 700, color: "var(--espresso)", letterSpacing: "-1px", marginBottom: 8 }}>{sec?.title}</h2>
            {sec?.questions?.map((q, qi) => (
              <div key={q.id} className="p-card" style={{ background: "#fff", padding: 28, borderColor: answers[q.id] !== undefined ? "var(--coral)" : "var(--blush)" }}>
                <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                  <span style={{ fontFamily: "Syne, sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "var(--coral)", flexShrink: 0, marginTop: 2 }}>Q{qi + 1}</span>
                  <p style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 400, color: "var(--espresso)", lineHeight: 1.6 }}>
                    {q.text}
                    {q.required && <span style={{ color: "var(--coral)", marginLeft: 4 }}>*</span>}
                  </p>
                </div>
                <QuestionInput question={q} value={answers[q.id]} onChange={v => setAnswers(p => ({ ...p, [q.id]: v }))} />
              </div>
            ))}
          </motion.div>
        </AnimatePresence>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 40, paddingTop: 32, borderTop: "1px solid var(--blush)" }}>
          <button
            onClick={() => setSecIdx(p => Math.max(0, p - 1))}
            disabled={secIdx === 0}
            className="btn-espresso"
            style={{ opacity: secIdx === 0 ? 0.3 : 1 }}
          >
            ← Previous
          </button>
          {isLast
            ? <button onClick={() => { localStorage.removeItem(`draft_${token}`); setSubmitted(true); }} disabled={!canNext} className="btn-fire">
              <span>Submit Survey</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
            </button>
            : <button onClick={() => setSecIdx(p => p + 1)} disabled={!canNext} className="btn-fire">
              <span>Next Section</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </button>
          }
        </div>
      </div>
    </div>
  );
}

// ─── ANALYTICS ─────────────────────────────────────────────────────────────────
function AnalyticsPage({ survey }) {
  const [aiLoading, setAiLoading] = useState(false);
  const weekData = [{ day: "Mon", r: 34 }, { day: "Tue", r: 52 }, { day: "Wed", r: 41 }, { day: "Thu", r: 68 }, { day: "Fri", r: 45 }, { day: "Sat", r: 12 }, { day: "Sun", r: 8 }];
  const deptData = [{ dept: "Dept A", v: 89 }, { dept: "Dept B", v: 67 }, { dept: "Dept C", v: 52 }, { dept: "Dept D", v: 39 }];
  const satData = [{ name: "Very Satisfied", v: 38 }, { name: "Satisfied", v: 42 }, { name: "Neutral", v: 12 }, { name: "Dissatisfied", v: 6 }, { name: "Very Dissatisfied", v: 2 }];
  const radarData = [{ m: "Work Env", s: 4.2 }, { m: "Management", s: 3.8 }, { m: "Growth", s: 3.5 }, { m: "Culture", s: 4.5 }, { m: "Benefits", s: 4.0 }, { m: "Balance", s: 3.9 }];
  const nps = { promoters: 56, passives: 28, detractors: 16, score: 40 };

  const insights = [
    { type: "positive", title: "Strong Culture Score", detail: "85% of respondents rated culture 4★ or higher — 12% above industry average." },
    { type: "warning", title: "Career Growth Decline", detail: "Growth scores dropped 0.7 pts from Q3 to 6.8/10. Recommend reviewing mentorship & promotion clarity." },
    { type: "info", title: "Hybrid Work Preference", detail: "67% prefer 1–4 day hybrid schedules. Formalizing policy could improve retention by ~18%." },
    { type: "action", title: "High ROI Action", detail: "Launch structured career ladders. Employees with clear growth paths are 3× more likely to stay long-term." },
  ];

  const insightColors = {
    positive: { bg: "rgba(30,122,74,0.08)", border: "rgba(30,122,74,0.2)", tag: "var(--sage)", icon: "↑" },
    warning: { bg: "rgba(255,184,0,0.08)", border: "rgba(255,184,0,0.25)", tag: "var(--saffron)", icon: "!" },
    info: { bg: "rgba(0,71,255,0.06)", border: "rgba(0,71,255,0.18)", tag: "var(--cobalt)", icon: "i" },
    action: { bg: "rgba(255,69,0,0.06)", border: "rgba(255,69,0,0.2)", tag: "var(--coral)", icon: "→" },
  };

  return (
    <PageWrap>
      <PageHeader
        tag="Research Intelligence"
        title={<><em style={{ fontStyle: "italic", color: "var(--saffron)" }}>Deep</em> Analytics</>}
        sub={survey?.title || "Employee Satisfaction Q4 2024"}
        action={
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn-outline-cream" style={{ fontSize: 10, padding: "12px 20px" }}>Export CSV</button>
            <button className="btn-outline-cream" style={{ fontSize: 10, padding: "12px 20px" }}>Export PDF</button>
          </div>
        }
      />

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 40 }}>
        {[
          { lbl: "Total Responses", val: "247", delta: 23, up: true },
          { lbl: "Completion Rate", val: "87%", delta: 4, up: true },
          { lbl: "Avg. Rating", val: "4.2★", delta: 2, up: true },
          { lbl: "NPS Score", val: "40", delta: 8, up: true },
        ].map((s, i) => (
          <motion.div key={s.lbl} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <div className="stat-card">
              <div className="stat-lbl">{s.lbl}</div>
              <div className="stat-val">{s.val}</div>
              <div className={`stat-delta ${s.up ? "up" : "dn"}`}>
                <span>{s.up ? "▲" : "▼"}</span><span>{s.delta}%</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 20, marginBottom: 40 }}>
        <div className="p-card-dark" style={{ padding: 32 }}>
          <div style={{ fontFamily: "Syne, sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(253,245,232,0.4)", marginBottom: 28 }}>Daily Responses</div>
          <ResponsiveContainer width="100%" height={210}>
            <LineChart data={weekData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(253,245,232,0.05)" />
              <XAxis dataKey="day" stroke="transparent" tick={{ fontFamily: "Syne, sans-serif", fontSize: 10, fill: "rgba(253,245,232,0.3)", fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis stroke="transparent" tick={{ fontFamily: "Syne, sans-serif", fontSize: 10, fill: "rgba(253,245,232,0.3)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "var(--espresso-mid)", border: "1px solid rgba(253,245,232,0.1)", borderRadius: 12, fontFamily: "Fraunces, serif", color: "var(--cream)" }} />
              <Line type="monotone" dataKey="r" stroke="var(--coral)" strokeWidth={2.5} dot={{ fill: "var(--coral)", r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="p-card-dark" style={{ padding: 32 }}>
          <div style={{ fontFamily: "Syne, sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(253,245,232,0.4)", marginBottom: 28 }}>Satisfaction Split</div>
          <ResponsiveContainer width="100%" height={210}>
            <PieChart>
              <Pie data={satData} dataKey="v" nameKey="name" cx="50%" cy="50%" outerRadius={85} innerRadius={48} paddingAngle={3}>
                {satData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "var(--espresso-mid)", border: "1px solid rgba(253,245,232,0.1)", borderRadius: 12, fontFamily: "Fraunces, serif", color: "var(--cream)" }} />
              <Legend wrapperStyle={{ fontFamily: "Syne, sans-serif", fontSize: 10, color: "rgba(253,245,232,0.4)" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="p-card-dark" style={{ padding: 32 }}>
          <div style={{ fontFamily: "Syne, sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(253,245,232,0.4)", marginBottom: 28 }}>By Department</div>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={deptData} layout="vertical" barSize={22}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(253,245,232,0.05)" horizontal={false} />
              <XAxis type="number" stroke="transparent" tick={{ fontFamily: "Syne, sans-serif", fontSize: 10, fill: "rgba(253,245,232,0.3)" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="dept" stroke="transparent" tick={{ fontFamily: "Syne, sans-serif", fontSize: 10, fill: "rgba(253,245,232,0.3)", fontWeight: 600 }} axisLine={false} tickLine={false} width={64} />
              <Tooltip contentStyle={{ background: "var(--espresso-mid)", border: "1px solid rgba(253,245,232,0.1)", borderRadius: 12, fontFamily: "Fraunces, serif", color: "var(--cream)" }} />
              <Bar dataKey="v" fill="var(--saffron)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="p-card-dark" style={{ padding: 32 }}>
          <div style={{ fontFamily: "Syne, sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(253,245,232,0.4)", marginBottom: 28 }}>Category Scores</div>
          <ResponsiveContainer width="100%" height={210}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(253,245,232,0.08)" />
              <PolarAngleAxis dataKey="m" tick={{ fill: "rgba(253,245,232,0.35)", fontSize: 10, fontFamily: "Syne, sans-serif", fontWeight: 600 }} />
              <Radar dataKey="s" stroke="var(--coral)" fill="var(--coral)" fillOpacity={0.15} strokeWidth={2} />
              <Tooltip contentStyle={{ background: "var(--espresso-mid)", border: "1px solid rgba(253,245,232,0.1)", borderRadius: 12, fontFamily: "Fraunces, serif", color: "var(--cream)" }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* NPS */}
      <div className="p-card-dark" style={{ padding: 36, marginBottom: 40 }}>
        <div style={{ fontFamily: "Syne, sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(253,245,232,0.4)", marginBottom: 28 }}>Net Promoter Score</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 28 }}>
          {[
            { l: "Promoters", v: nps.promoters, color: "var(--sage)", dim: "rgba(30,122,74,0.2)", score: "9–10" },
            { l: "Passives", v: nps.passives, color: "var(--saffron)", dim: "rgba(255,184,0,0.15)", score: "7–8" },
            { l: "Detractors", v: nps.detractors, color: "var(--terracotta)", dim: "rgba(214,59,31,0.15)", score: "0–6" },
          ].map(x => (
            <div key={x.l} style={{ background: x.dim, borderRadius: 16, padding: 24, textAlign: "center", border: `1px solid ${x.dim}` }}>
              <div style={{ fontFamily: "Playfair Display, serif", fontSize: 40, fontWeight: 900, color: "var(--cream)", lineHeight: 1 }}>{x.v}%</div>
              <div style={{ fontFamily: "Syne, sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: x.color, marginTop: 6 }}>{x.l}</div>
              <div style={{ fontFamily: "Fraunces, serif", fontSize: 12, fontWeight: 300, color: "rgba(253,245,232,0.35)", marginTop: 3 }}>Score {x.score}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ flex: 1, height: 10, borderRadius: 10, overflow: "hidden", display: "flex", gap: 2, background: "rgba(253,245,232,0.06)" }}>
            <div style={{ background: "var(--sage)", width: `${nps.promoters}%`, borderRadius: "10px 0 0 10px" }} />
            <div style={{ background: "var(--saffron)", width: `${nps.passives}%` }} />
            <div style={{ background: "var(--terracotta)", width: `${nps.detractors}%`, borderRadius: "0 10px 10px 0" }} />
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontFamily: "Syne, sans-serif", fontSize: 9, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(253,245,232,0.3)" }}>NPS Score</div>
            <div style={{ fontFamily: "Playfair Display, serif", fontSize: 36, fontWeight: 900, color: "var(--cream)", lineHeight: 1 }}>{nps.score}</div>
          </div>
        </div>
      </div>

      {/* AI Insights */}
      <div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
          <div>
            <div className="sec-tag on-dark">AI-Powered</div>
            <h3 style={{ fontFamily: "Playfair Display, serif", fontSize: 36, fontWeight: 900, color: "var(--cream)", letterSpacing: "-1.5px" }}>
              Research <em style={{ fontStyle: "italic", color: "var(--saffron)" }}>Insights</em>
            </h3>
          </div>
          <button onClick={() => { setAiLoading(true); setTimeout(() => setAiLoading(false), 1800); }} className="btn-outline-cream" style={{ fontSize: 10 }}>
            Regenerate
          </button>
        </div>

        {aiLoading ? (
          <div className="p-card-dark" style={{ padding: 64, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <div className="p-spinner" style={{ borderTopColor: "var(--coral)", borderColor: "rgba(253,245,232,0.1)" }} />
            <p style={{ fontFamily: "Fraunces, serif", fontSize: 16, fontWeight: 300, color: "rgba(253,245,232,0.4)" }}>
              Analysing responses…
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {insights.map((ins, i) => {
              const c = insightColors[ins.type];
              return (
                <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                  <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 20, padding: 28 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 10, background: c.border,
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                        fontFamily: "Syne, sans-serif", fontSize: 14, fontWeight: 700, color: c.tag
                      }}>{c.icon}</div>
                      <div>
                        <div style={{ fontFamily: "Syne, sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: c.tag, marginBottom: 8 }}>{ins.title}</div>
                        <p style={{ fontFamily: "Fraunces, serif", fontSize: 14, fontWeight: 300, color: "rgba(253,245,232,0.65)", lineHeight: 1.65 }}>{ins.detail}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </PageWrap>
  );
}

// ─── TEAM PAGE ────────────────────────────────────────────────────────────────
function UsersPage({ users, onAdd, onUpdate, onRemove }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "creator" });

  return (
    <PageWrap>
      <PageHeader
        tag="People"
        title="Team"
        sub={`${users.length} members in your workspace`}
        action={
          <button onClick={() => setModal(true)} className="btn-fire">
            <span><PlusIcon size={14} /></span>
            <span>Invite Member</span>
          </button>
        }
      />

      <div className="p-card-dark" style={{ overflow: "hidden" }}>
        <table className="p-table">
          <thead>
            <tr>
              {["Member", "Email", "Role", "Status", "Actions"].map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <Avatar name={u.name} size="sm" />
                    <span style={{ fontFamily: "Fraunces, serif", fontSize: 14, color: "rgba(253,245,232,0.8)" }}>{u.name}</span>
                  </div>
                </td>
                <td>{u.email}</td>
                <td>
                  <select
                    value={u.role}
                    onChange={e => onUpdate(u.id, { role: e.target.value })}
                    className="p-input dark"
                    style={{ width: "auto", padding: "6px 12px", fontSize: 12 }}
                  >
                    <option value="admin">Admin</option>
                    <option value="creator">Creator</option>
                    <option value="manager">Manager</option>
                  </select>
                </td>
                <td>
                  <span className={u.status === "active" ? "p-badge p-badge-active p-badge-pip" : "p-badge p-badge-closed p-badge-pip"}>
                    {u.status}
                  </span>
                </td>
                <td>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => onUpdate(u.id, { status: u.status === "active" ? "inactive" : "active" })}
                      style={{ fontFamily: "Syne, sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", background: "none", border: "none", cursor: "pointer", color: "rgba(253,245,232,0.35)", transition: "color 0.2s" }}
                      onMouseEnter={e => e.currentTarget.style.color = "var(--saffron)"}
                      onMouseLeave={e => e.currentTarget.style.color = "rgba(253,245,232,0.35)"}
                    >
                      {u.status === "active" ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      onClick={() => onRemove(u.id)}
                      style={{ fontFamily: "Syne, sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", background: "none", border: "none", cursor: "pointer", color: "rgba(253,245,232,0.35)", transition: "color 0.2s" }}
                      onMouseEnter={e => e.currentTarget.style.color = "var(--terracotta)"}
                      onMouseLeave={e => e.currentTarget.style.color = "rgba(253,245,232,0.35)"}
                    >
                      Remove
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {modal && (
          <Modal open title="Invite Team Member" onClose={() => setModal(false)} dark>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <Input label="Full Name" value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} placeholder="Jane Smith" required dark />
              <Input label="Work Email" type="email" value={form.email} onChange={v => setForm(p => ({ ...p, email: v }))} placeholder="jane@company.com" required dark />
              <PSelect label="Role" value={form.role} onChange={v => setForm(p => ({ ...p, role: v }))} dark
                options={[{ value: "creator", label: "Survey Creator" }, { value: "manager", label: "Survey Manager" }, { value: "admin", label: "Admin" }]}
              />
              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button onClick={() => setModal(false)} className="btn-outline-cream" style={{ flex: 1, justifyContent: "center" }}>Cancel</button>
                <button
                  onClick={() => {
                    if (!form.name || !form.email) return;
                    onAdd({ ...form, id: genId(), status: "active" });
                    setModal(false); setForm({ name: "", email: "", role: "creator" });
                  }}
                  className="btn-fire"
                  style={{ flex: 1, justifyContent: "center" }}
                >
                  <span>Send Invite</span>
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </PageWrap>
  );
}

// ─── LINKS PAGE ───────────────────────────────────────────────────────────────
function LinksPage({ user, surveys, links, onAdd, onRemove, onCopy }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ surveyId: surveys[0]?.id || "", email: "" });
  const canManage = ["admin", "creator"].includes(user?.role);
  const getTitle = id => surveys.find(s => s.id === id)?.title || "Unknown";

  return (
    <PageWrap>
      <PageHeader
        tag="Distribution"
        title="Survey Links"
        sub="Generate tracked links with click & conversion analytics"
        action={canManage && (
          <button onClick={() => setModal(true)} className="btn-fire">
            <span><LinkIcon size={14} /></span>
            <span>Generate Link</span>
          </button>
        )}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 40 }}>
        {[
          { lbl: "Total Links", val: links.length },
          { lbl: "Total Clicks", val: links.reduce((a, l) => a + l.clicks, 0).toLocaleString() },
          { lbl: "Total Responses", val: links.reduce((a, l) => a + l.responses, 0).toLocaleString() },
        ].map((s, i) => (
          <div key={s.lbl} className="stat-card">
            <div className="stat-lbl">{s.lbl}</div>
            <div className="stat-val">{s.val}</div>
          </div>
        ))}
      </div>

      <div className="p-card-dark" style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="p-table" style={{ minWidth: 720 }}>
            <thead>
              <tr>
                {["Recipient", "Survey", "Clicks", "Responses", "Conversion", "Status", ""].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {links.map(link => {
                const conv = link.clicks > 0 ? Math.round((link.responses / link.clicks) * 100) : 0;
                return (
                  <tr key={link.id}>
                    <td>
                      <div style={{ fontFamily: "Fraunces, serif", fontSize: 14, color: "rgba(253,245,232,0.75)" }}>{link.email}</div>
                      <div style={{ fontFamily: "Syne, monospace", fontSize: 10, color: "rgba(253,245,232,0.25)", marginTop: 2, letterSpacing: "0.05em" }}>{link.token}</div>
                    </td>
                    <td style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{getTitle(link.surveyId)}</td>
                    <td>
                      <span style={{ fontFamily: "Playfair Display, serif", fontSize: 20, fontWeight: 700, color: "var(--cream)" }}>{link.clicks.toLocaleString()}</span>
                    </td>
                    <td>
                      <span style={{ fontFamily: "Playfair Display, serif", fontSize: 20, fontWeight: 700, color: "var(--cream)" }}>{link.responses}</span>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 60, height: 4, background: "rgba(253,245,232,0.08)", borderRadius: 4, overflow: "hidden" }}>
                          <div style={{ height: "100%", background: "var(--coral)", width: `${conv}%`, borderRadius: 4 }} />
                        </div>
                        <span style={{ fontFamily: "Syne, sans-serif", fontSize: 11, fontWeight: 700, color: "rgba(253,245,232,0.6)" }}>{conv}%</span>
                      </div>
                    </td>
                    <td><span className={statusBadge(link.status)}>{link.status}</span></td>
                    <td>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() => onCopy(link.token)}
                          style={{ fontFamily: "Syne, sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", background: "none", border: "none", cursor: "pointer", color: "rgba(253,245,232,0.35)", transition: "color 0.2s" }}
                          onMouseEnter={e => e.currentTarget.style.color = "var(--saffron)"}
                          onMouseLeave={e => e.currentTarget.style.color = "rgba(253,245,232,0.35)"}
                        >Copy</button>
                        <button
                          onClick={() => { if (window.confirm("Delete this link?")) onRemove(link.id); }}
                          style={{ fontFamily: "Syne, sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", background: "none", border: "none", cursor: "pointer", color: "rgba(253,245,232,0.35)", transition: "color 0.2s" }}
                          onMouseEnter={e => e.currentTarget.style.color = "var(--terracotta)"}
                          onMouseLeave={e => e.currentTarget.style.color = "rgba(253,245,232,0.35)"}
                        >Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {modal && (
          <Modal open title="Generate Survey Link" onClose={() => setModal(false)} dark>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <PSelect label="Survey" value={form.surveyId} onChange={v => setForm(p => ({ ...p, surveyId: v }))} dark
                options={surveys.filter(s => s.status !== "draft").map(s => ({ value: s.id, label: s.title }))}
              />
              <Input label="Recipient Email" type="email" value={form.email} onChange={v => setForm(p => ({ ...p, email: v }))} placeholder="team@department.com" required dark />
              <div style={{ background: "rgba(255,69,0,0.08)", border: "1px solid rgba(255,69,0,0.2)", borderRadius: 14, padding: "14px 18px", fontFamily: "Fraunces, serif", fontSize: 13, fontWeight: 300, color: "rgba(253,245,232,0.5)", lineHeight: 1.6 }}>
                Each link is uniquely tagged to this email. Clicks and responses are tracked independently per link.
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button onClick={() => setModal(false)} className="btn-outline-cream" style={{ flex: 1, justifyContent: "center" }}>Cancel</button>
                <button
                  onClick={() => {
                    if (!form.surveyId || !form.email) return;
                    onAdd({ ...form, id: genId(), token: genToken(), clicks: 0, responses: 0, createdAt: new Date().toISOString().slice(0, 10), status: "active" });
                    setModal(false); setForm({ surveyId: surveys[0]?.id || "", email: "" });
                  }}
                  className="btn-fire"
                  style={{ flex: 1, justifyContent: "center" }}
                >
                  <span>Generate Link</span>
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </PageWrap>
  );
}

// ─── INACTIVITY HOOK ──────────────────────────────────────────────────────────
function useInactivity(ms, onFire) {
  const t = useRef();
  const reset = useCallback(() => { clearTimeout(t.current); t.current = setTimeout(onFire, ms); }, [ms, onFire]);
  useEffect(() => {
    const evts = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    evts.forEach(e => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => { evts.forEach(e => window.removeEventListener(e, reset)); clearTimeout(t.current); };
  }, [reset]);
}

// ─── SEED DATA ────────────────────────────────────────────────────────────────
const INIT_SURVEYS = [
  {
    id: "s1", title: "Employee Satisfaction Q4 2024", description: "Annual employee satisfaction and engagement survey",
    status: "active", createdAt: "2024-10-01", responses: 247, links: 3,
    sections: [
      {
        id: "sec1", title: "Work Environment", questions: [
          { id: "q1", type: "rating_star", text: "How satisfied are you with your overall work environment?", required: true, options: [] },
          { id: "q2", type: "likert", text: "My team communicates effectively and transparently.", required: true, options: LIKERT_OPTIONS },
          { id: "q3", type: "radio", text: "How often do you work from home?", required: true, options: ["Never", "1-2 days/week", "3-4 days/week", "Fully remote"] },
        ]
      },
      {
        id: "sec2", title: "Career Growth", questions: [
          { id: "q4", type: "rating_number", text: "Rate your career growth opportunities (1–10)", required: true, options: [], settings: { min: 1, max: 10 } },
          { id: "q5", type: "checkbox", text: "Which benefits do you value most?", required: false, options: ["Health Insurance", "401k Match", "Remote Work", "Learning Budget", "Gym Membership"] },
          { id: "q6", type: "text", text: "What would make the biggest impact on your career growth here?", required: false, options: [] },
        ]
      },
    ]
  },
  {
    id: "s2", title: "Product Feedback — Q4 Beta", description: "Gather detailed feedback from beta users",
    status: "active", createdAt: "2024-09-15", responses: 89, links: 5,
    sections: [
      {
        id: "sec3", title: "Product Experience", questions: [
          { id: "q7", type: "nps", text: "How likely are you to recommend our product to a friend?", required: true, options: [] },
          { id: "q8", type: "radio", text: "How did you first hear about us?", required: true, options: ["Social Media", "Word of Mouth", "Search Engine", "Referral", "Other"] },
          { id: "q9", type: "text", text: "What feature would you most like to see added?", required: false, options: [] },
        ]
      },
    ]
  },
  { id: "s3", title: "New Hire Onboarding Feedback", description: "30-day onboarding experience survey", status: "draft", createdAt: "2024-10-10", responses: 0, links: 0, sections: [{ id: "sec4", title: "General", questions: [] }] },
];

const INIT_LINKS = [
  { id: "l1", surveyId: "s1", email: "team@dept-a.com", token: "a1b2c3d4e5f6g7h8", clicks: 45, responses: 38, createdAt: "2024-10-01", status: "active" },
  { id: "l2", surveyId: "s1", email: "team@dept-b.com", token: "b2c3d4e5f6g7h8i9", clicks: 112, responses: 97, createdAt: "2024-10-01", status: "active" },
  { id: "l3", surveyId: "s2", email: "beta@users.net", token: "d4e5f6g7h8i9j0k1", clicks: 203, responses: 89, createdAt: "2024-09-15", status: "active" },
];

const INIT_USERS = [
  { id: "u1", name: "Alex Morgan", email: "admin@nexora.io", role: "admin", status: "active" },
  { id: "u2", name: "Jordan Lee", email: "creator@nexora.io", role: "creator", status: "active" },
  { id: "u3", name: "Sam Rivera", email: "manager@nexora.io", role: "manager", status: "active" },
  { id: "u4", name: "Casey Kim", email: "casey@nexora.io", role: "creator", status: "inactive" },
];

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [surveys, setSurveys] = useState(INIT_SURVEYS);
  const [users, setUsers] = useState(INIT_USERS);
  const [links, setLinks] = useState(INIT_LINKS);
  const [editId, setEditId] = useState(null);
  const [viewId, setViewId] = useState(null);
  const [previewSurvey, setPreviewSurvey] = useState(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  useInactivity(INACTIVITY_MS, () => { if (user) setSessionExpired(true); });

  const nav = (p) => { setPage(p); setViewId(null); };
  const logout = () => { setUser(null); setPage("dashboard"); setSessionExpired(false); };

  if (!user) return <LoginPage onLogin={setUser} />;

  // Survey response preview
  if (page === "respond" && previewSurvey) return (
    <div style={{ minHeight: "100vh", background: "var(--cream)" }}>
      <div style={{ background: "var(--saffron)", padding: "10px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "Syne, sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "var(--espresso)" }}>PREVIEW MODE — Responses won't be saved</span>
        <button onClick={() => { setPreviewSurvey(null); setPage("surveys"); }} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "Syne, sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "var(--espresso)" }}>
          × EXIT PREVIEW
        </button>
      </div>
      <SurveyResponsePage survey={previewSurvey} token="preview" onComplete={() => { setPreviewSurvey(null); setPage("surveys"); }} />
    </div>
  );

  // Builder page
  if (page === "builder") {
    const editing = editId ? surveys.find(s => s.id === editId) : null;
    return (
      <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
        <Sidebar page={page} onNav={nav} user={user} onLogout={logout} />
        <main style={{ flex: 1, overflowY: "auto" }}>
          <SurveyBuilderPage
            survey={editing}
            onCancel={() => { setEditId(null); nav("surveys"); }}
            onSave={data => {
              if (editId) setSurveys(p => p.map(s => s.id === editId ? { ...s, ...data } : s));
              else setSurveys(p => [...p, { id: genId(), ...data, status: "draft", createdAt: new Date().toISOString().slice(0, 10), responses: 0, links: 0 }]);
              setEditId(null); nav("surveys");
            }}
          />
        </main>
      </div>
    );
  }

  const viewSurvey = viewId ? surveys.find(s => s.id === viewId) : surveys[0];

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar page={page} onNav={nav} user={user} onLogout={logout} />
      <main style={{ flex: 1, overflowY: "auto" }}>
        <AnimatePresence mode="wait">
          <motion.div key={page} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            {page === "dashboard" && <DashboardPage user={user} surveys={surveys} links={links} onNav={nav} />}
            {page === "surveys" && (
              <SurveysPage user={user} surveys={surveys}
                onNew={() => { setEditId(null); setPage("builder"); }}
                onEdit={id => { setEditId(id); setPage("builder"); }}
                onViewAnalytics={id => { setViewId(id); nav("analytics"); }}
                onToggle={id => setSurveys(p => p.map(s => s.id === id ? { ...s, status: s.status === "active" ? "paused" : s.status === "paused" ? "active" : s.status } : s))}
                onDelete={id => { if (window.confirm("Permanently delete this survey?")) { setSurveys(p => p.filter(s => s.id !== id)); setLinks(p => p.filter(l => l.surveyId !== id)); } }}
              />
            )}
            {page === "analytics" && <AnalyticsPage survey={viewSurvey} />}
            {page === "users" && user.role === "admin" && (
              <UsersPage users={users}
                onAdd={u => setUsers(p => [...p, u])}
                onUpdate={(id, upd) => setUsers(p => p.map(u => u.id === id ? { ...u, ...upd } : u))}
                onRemove={id => setUsers(p => p.filter(u => u.id !== id))}
              />
            )}
            {page === "links" && (
              <LinksPage user={user} surveys={surveys} links={links}
                onAdd={l => { setLinks(p => [...p, l]); setSurveys(p => p.map(s => s.id === l.surveyId ? { ...s, links: (s.links || 0) + 1 } : s)); }}
                onRemove={id => setLinks(p => p.filter(l => l.id !== id))}
                onCopy={token => {
                  const url = `${location.origin}/survey/${token}`;
                  navigator.clipboard.writeText(url).then(() => toast.success("Link copied!"), () => prompt("Copy link:", url));
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Session Timeout */}
      <AnimatePresence>
        {sessionExpired && (
          <div className="p-modal-overlay">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ background: "var(--espresso)", border: "1px solid rgba(253,245,232,0.1)", borderRadius: 24, padding: 48, maxWidth: 400, width: "100%", textAlign: "center" }}
            >
              <div style={{ fontFamily: "Playfair Display, serif", fontSize: 52, fontWeight: 900, color: "rgba(253,245,232,0.06)", marginBottom: 16, letterSpacing: "-3px" }}>Idle</div>
              <h3 style={{ fontFamily: "Playfair Display, serif", fontSize: 26, fontWeight: 700, color: "var(--cream)", marginBottom: 12, letterSpacing: "-1px" }}>Session expired</h3>
              <p style={{ fontFamily: "Fraunces, serif", fontSize: 15, fontWeight: 300, color: "rgba(253,245,232,0.45)", marginBottom: 32, lineHeight: 1.6 }}>
                You were signed out after 15 minutes of inactivity. Any in-progress responses were auto-saved.
              </p>
              <button onClick={logout} className="btn-fire" style={{ width: "100%", justifyContent: "center" }}>
                <span>Sign In Again</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
