import { useState, useEffect, useCallback, useRef } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, AreaChart, Area
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const C = {
  bg:            '#F7F5F2',
  bg2:           '#F0EDE8',
  surface:       '#FFFFFF',
  surface2:      '#FAF9F7',
  border:        '#E8E2D9',
  border2:       '#D9D1C7',
  text1:         '#1C1917',
  text2:         '#6B6460',
  text3:         '#A8A29E',
  accent:        '#4F63D2',
  accentLight:   '#EEF0FD',
  accentDark:    '#3B4FB8',
  violet:        '#7C3AED',
  violetLight:   '#F3EEFF',
  success:       '#16A34A',
  successLight:  '#DCFCE7',
  warning:       '#CA8A04',
  warningLight:  '#FEF9C3',
  danger:        '#DC2626',
  dangerLight:   '#FEE2E2',
  teal:          '#0D9488',
  tealLight:     '#CCFBF1',
  amber:         '#D97706',
  amberLight:    '#FEF3C7',
};

const CHART_PALETTE = ['#4F63D2','#7C3AED','#0D9488','#CA8A04','#DC2626','#2563EB','#9333EA'];

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const INACTIVITY_MS = 15 * 60 * 1000;

const QUESTION_TYPES = [
  { id: 'radio',         label: 'Single Choice',   icon: '◉', desc: 'One answer from a list' },
  { id: 'checkbox',      label: 'Multiple Choice',  icon: '☑', desc: 'Select all that apply' },
  { id: 'rating_star',   label: 'Star Rating',      icon: '★', desc: 'Visual 1–5 star scale' },
  { id: 'rating_number', label: 'Number Scale',     icon: '⓪', desc: 'Custom numeric range' },
  { id: 'likert',        label: 'Likert Scale',     icon: '⇔', desc: 'Agree / Disagree spectrum' },
  { id: 'nps',           label: 'NPS Score',        icon: '◐', desc: 'Net Promoter Score 0–10' },
  { id: 'text',          label: 'Free Text',        icon: '✦', desc: 'Open-ended response' },
  { id: 'dropdown',      label: 'Dropdown',         icon: '▿', desc: 'Select from a list' },
];

const LIKERT_OPTIONS = [
  'Strongly Agree','Agree','Partially Agree',
  'Neutral','Partially Disagree','Disagree','Strongly Disagree'
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const genId    = () => Math.random().toString(36).slice(2, 10);
const genToken = () => Math.random().toString(36).slice(2, 18);

function exportCSV(rows, filename) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const csv  = [keys.join(','), ...rows.map(r => keys.map(k => `"${String(r[k] ?? '')}"`).join(','))].join('\n');
  const a    = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: filename,
  });
  a.click();
}

function statusMeta(status) {
  return {
    active:   { label: 'Active',   bg: C.successLight, text: C.success,  dot: C.success  },
    paused:   { label: 'Paused',   bg: C.amberLight,   text: C.amber,    dot: C.amber    },
    draft:    { label: 'Draft',    bg: '#F1F0EE',       text: C.text3,    dot: C.text3    },
    closed:   { label: 'Closed',   bg: C.dangerLight,  text: C.danger,   dot: C.danger   },
    inactive: { label: 'Inactive', bg: '#F1F0EE',       text: C.text3,    dot: C.text3    },
  }[status] || { label: status, bg: '#F1F0EE', text: C.text3, dot: C.text3 };
}

// ─── FRAMER VARIANTS ─────────────────────────────────────────────────────────
const fadeUp  = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.4,0,0.2,1] } } };
const fadeIn  = { hidden: { opacity: 0 },         show: { opacity: 1, transition: { duration: 0.25 } } };
const stagger = { show: { transition: { staggerChildren: 0.06 } } };
const scaleIn = { hidden: { opacity: 0, scale: 0.96 }, show: { opacity: 1, scale: 1, transition: { duration: 0.2, ease: [0.4,0,0.2,1] } } };

// ─── CUSTOM TOOLTIP ───────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px', boxShadow: '0 8px 24px rgba(28,25,23,.10)' }}>
      {label && <div style={{ fontSize: 11, color: C.text3, marginBottom: 4, fontFamily: 'DM Sans' }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ fontSize: 13, fontWeight: 600, color: p.color || C.text1, fontFamily: 'Sora' }}>
          {p.name && <span style={{ color: C.text2, fontWeight: 400, marginRight: 6 }}>{p.name}</span>}
          {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </div>
      ))}
    </div>
  );
};

// ─── UI COMPONENTS ────────────────────────────────────────────────────────────

function Badge({ status, children, custom }) {
  const meta = status ? statusMeta(status) : null;
  const bg   = custom?.bg   || meta?.bg   || '#F1F0EE';
  const text = custom?.text || meta?.text || C.text2;
  const dot  = custom?.dot  || meta?.dot;
  const label = children || meta?.label || status;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 99, background: bg, fontSize: 12, fontWeight: 500, color: text, fontFamily: 'DM Sans', whiteSpace: 'nowrap' }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot, flexShrink: 0 }} />}
      {label}
    </span>
  );
}

function Btn({ children, variant = 'primary', size = 'md', onClick, disabled, icon, className = '', type = 'button', loading }) {
  const sizes = {
    xs: { padding: '5px 12px',   fontSize: 12, height: 28, gap: 5  },
    sm: { padding: '7px 14px',   fontSize: 13, height: 32, gap: 5  },
    md: { padding: '9px 18px',   fontSize: 14, height: 38, gap: 6  },
    lg: { padding: '12px 24px',  fontSize: 15, height: 46, gap: 8  },
  };
  const variants = {
    primary: {
      background: `linear-gradient(135deg, ${C.accent} 0%, ${C.violet} 100%)`,
      color: '#fff', border: 'none',
      boxShadow: `0 1px 2px rgba(79,99,210,.3), inset 0 1px 0 rgba(255,255,255,.15)`,
    },
    secondary: {
      background: C.surface, color: C.text1,
      border: `1.5px solid ${C.border}`,
      boxShadow: '0 1px 2px rgba(28,25,23,.05)',
    },
    ghost: { background: 'transparent', color: C.text2, border: '1.5px solid transparent' },
    danger: { background: C.dangerLight, color: C.danger, border: `1.5px solid #FECACA` },
    success: { background: C.successLight, color: C.success, border: `1.5px solid #BBF7D0` },
    accent: { background: C.accentLight, color: C.accent, border: `1.5px solid #C7CEFF` },
  };
  const s = sizes[size] || sizes.md;
  const v = variants[variant] || variants.primary;
  return (
    <button type={type} onClick={onClick} disabled={disabled || loading}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        gap: s.gap, padding: s.padding, fontSize: s.fontSize, height: s.height,
        fontFamily: 'DM Sans', fontWeight: 500, borderRadius: 10, cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1, whiteSpace: 'nowrap', letterSpacing: '-0.01em',
        transition: 'all 0.15s ease', ...v,
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.filter = 'brightness(0.95)'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = v.boxShadow ? '0 4px 12px rgba(79,99,210,.25)' : '0 4px 8px rgba(28,25,23,.08)'; }}
      onMouseLeave={e => { e.currentTarget.style.filter = ''; e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = v.boxShadow || ''; }}
      className={className}>
      {loading ? <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span> : icon && <span style={{ fontSize: s.fontSize + 1 }}>{icon}</span>}
      {children}
    </button>
  );
}

function Input({ label, value, onChange, placeholder, type = 'text', required, error, hint, prefix, suffix }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      {label && (
        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: C.text2, marginBottom: 6, letterSpacing: '-0.01em' }}>
          {label}{required && <span style={{ color: C.danger, marginLeft: 3 }}>*</span>}
        </label>
      )}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {prefix && <span style={{ position: 'absolute', left: 12, color: C.text3, fontSize: 14, pointerEvents: 'none' }}>{prefix}</span>}
        <input
          type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            width: '100%', padding: `10px ${suffix ? '38px' : '14px'} 10px ${prefix ? '36px' : '14px'}`,
            fontSize: 14, fontFamily: 'DM Sans', color: C.text1,
            background: focused ? C.surface : C.surface2,
            border: `1.5px solid ${focused ? C.accent : error ? C.danger : C.border}`,
            borderRadius: 10, outline: 'none',
            boxShadow: focused ? `0 0 0 3px ${C.accentLight}` : 'none',
            transition: 'all 0.15s ease',
          }}
        />
        {suffix && <span style={{ position: 'absolute', right: 12, color: C.text3, fontSize: 13, pointerEvents: 'none' }}>{suffix}</span>}
      </div>
      {(error || hint) && <p style={{ fontSize: 12, color: error ? C.danger : C.text3, marginTop: 5 }}>{error || hint}</p>}
    </div>
  );
}

function Textarea({ label, value, onChange, placeholder, rows = 3, hint }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      {label && <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: C.text2, marginBottom: 6 }}>{label}</label>}
      <textarea
        value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{
          width: '100%', padding: '10px 14px', fontSize: 14, fontFamily: 'DM Sans', color: C.text1,
          background: focused ? C.surface : C.surface2,
          border: `1.5px solid ${focused ? C.accent : C.border}`,
          borderRadius: 10, outline: 'none', resize: 'vertical', minHeight: 80,
          boxShadow: focused ? `0 0 0 3px ${C.accentLight}` : 'none',
          transition: 'all 0.15s ease',
        }}
      />
      {hint && <p style={{ fontSize: 12, color: C.text3, marginTop: 5 }}>{hint}</p>}
    </div>
  );
}

function SelectField({ label, value, onChange, options, hint }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      {label && <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: C.text2, marginBottom: 6 }}>{label}</label>}
      <div style={{ position: 'relative' }}>
        <select value={value} onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            width: '100%', padding: '10px 36px 10px 14px', fontSize: 14, fontFamily: 'DM Sans',
            color: C.text1, background: C.surface2, border: `1.5px solid ${focused ? C.accent : C.border}`,
            borderRadius: 10, outline: 'none', appearance: 'none', cursor: 'pointer',
            boxShadow: focused ? `0 0 0 3px ${C.accentLight}` : 'none', transition: 'all 0.15s ease',
          }}>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: C.text3, pointerEvents: 'none', fontSize: 12 }}>▾</span>
      </div>
      {hint && <p style={{ fontSize: 12, color: C.text3, marginTop: 5 }}>{hint}</p>}
    </div>
  );
}

function Card({ children, className = '', style = {}, hover = false, padding = '24px', onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div onClick={onClick}
      onMouseEnter={() => hover && setHovered(true)} onMouseLeave={() => hover && setHovered(false)}
      style={{
        background: C.surface, border: `1px solid ${hovered ? C.border2 : C.border}`,
        borderRadius: 16, padding, cursor: onClick ? 'pointer' : 'default',
        boxShadow: hovered ? '0 8px 24px rgba(28,25,23,.08)' : '0 1px 3px rgba(28,25,23,.05)',
        transition: 'all 0.2s ease', ...style,
      }} className={className}>
      {children}
    </div>
  );
}

function Divider({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
      <div style={{ flex: 1, height: 1, background: C.border }} />
      {label && <span style={{ fontSize: 11, color: C.text3, whiteSpace: 'nowrap', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 500 }}>{label}</span>}
      <div style={{ flex: 1, height: 1, background: C.border }} />
    </div>
  );
}

function Modal({ open, onClose, title, subtitle, children, size = 'md', footer }) {
  const widths = { sm: 440, md: 540, lg: 680, xl: 860 };
  useEffect(() => { document.body.style.overflow = open ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [open]);
  if (!open) return null;
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        onClick={onClose}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(28,25,23,.35)', backdropFilter: 'blur(8px)' }} />
        <motion.div variants={scaleIn} initial="hidden" animate="show"
          style={{ position: 'relative', background: C.surface, borderRadius: 20, boxShadow: '0 32px 80px rgba(28,25,23,.18)', width: '100%', maxWidth: widths[size], maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div style={{ padding: '24px 28px 20px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 600, color: C.text1, fontFamily: 'Sora', letterSpacing: '-0.02em' }}>{title}</h3>
                {subtitle && <p style={{ fontSize: 13, color: C.text2, marginTop: 3 }}>{subtitle}</p>}
              </div>
              <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, background: C.bg2, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.text2, fontSize: 16, flexShrink: 0 }}>✕</button>
            </div>
          </div>
          {/* Body */}
          <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }}>{children}</div>
          {/* Footer */}
          {footer && <div style={{ padding: '16px 28px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0 }}>{footer}</div>}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function StatCard({ label, value, icon, delta, accent = C.accent, sub }) {
  return (
    <motion.div variants={fadeUp}>
      <Card style={{ padding: '22px 24px', position: 'relative', overflow: 'hidden' }}>
        {/* Decorative gradient blob */}
        <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: accent, opacity: 0.06, filter: 'blur(16px)' }} />
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 500, color: C.text3, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 8 }}>{label}</p>
            <p style={{ fontSize: 28, fontWeight: 700, color: C.text1, fontFamily: 'Sora', letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</p>
            {delta !== undefined && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: delta >= 0 ? C.success : C.danger }}>
                  {delta >= 0 ? '↑' : '↓'} {Math.abs(delta)}%
                </span>
                <span style={{ fontSize: 11, color: C.text3 }}>vs last month</span>
              </div>
            )}
            {sub && <p style={{ fontSize: 12, color: C.text3, marginTop: 6 }}>{sub}</p>}
          </div>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: `${accent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{icon}</div>
        </div>
      </Card>
    </motion.div>
  );
}

function Avatar({ name = '?', size = 'sm', color }) {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const palette = ['#4F63D2','#7C3AED','#0D9488','#D97706','#DC2626','#2563EB','#9333EA'];
  const bg = color || palette[name.charCodeAt(0) % palette.length];
  const sizes = { xs: 28, sm: 36, md: 44, lg: 56 };
  const px = sizes[size] || 36;
  return (
    <div style={{ width: px, height: px, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 600, fontSize: px * 0.36, fontFamily: 'Sora', flexShrink: 0, letterSpacing: '-0.01em' }}>
      {initials}
    </div>
  );
}

function Toggle({ value, onChange, label, size = 'md' }) {
  const w = size === 'sm' ? 36 : 44;
  const h = size === 'sm' ? 20 : 24;
  const dot = size === 'sm' ? 14 : 18;
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
      <button type="button" onClick={() => onChange(!value)}
        style={{ width: w, height: h, borderRadius: 99, background: value ? C.accent : C.border2, border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s ease', flexShrink: 0 }}>
        <span style={{
          position: 'absolute', top: (h - dot) / 2, left: value ? w - dot - (h - dot) / 2 : (h - dot) / 2,
          width: dot, height: dot, borderRadius: '50%', background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,.2)', transition: 'left 0.2s cubic-bezier(.4,0,.2,1)',
        }} />
      </button>
      {label && <span style={{ fontSize: 13, color: C.text2, fontWeight: 400 }}>{label}</span>}
    </label>
  );
}

function ProgressRing({ value, size = 48, stroke = 4, color = C.accent }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.border} strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(.4,0,.2,1)' }} />
    </svg>
  );
}

function LinearProgress({ value, color = C.accent, height = 6, label, showPct = true }) {
  return (
    <div>
      {(label || showPct) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          {label && <span style={{ fontSize: 12, color: C.text2 }}>{label}</span>}
          {showPct && <span style={{ fontSize: 12, fontWeight: 600, color: C.text1, fontFamily: 'Sora' }}>{Math.round(value)}%</span>}
        </div>
      )}
      <div style={{ height, background: C.border, borderRadius: 99, overflow: 'hidden' }}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 0.8, ease: [0.4,0,0.2,1] }}
          style={{ height: '100%', background: color, borderRadius: 99 }} />
      </div>
    </div>
  );
}

function EmptyState({ icon, title, desc, action }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', gap: 12, textAlign: 'center' }}>
      <div style={{ width: 64, height: 64, borderRadius: 18, background: C.bg2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 16, fontWeight: 600, color: C.text1, fontFamily: 'Sora', marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 13, color: C.text3 }}>{desc}</div>
      </div>
      {action}
    </div>
  );
}

// ─── QUESTION WIDGETS ─────────────────────────────────────────────────────────
function StarRating({ value = 0, onChange, max = 5 }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {Array.from({ length: max }, (_, i) => i + 1).map(n => (
        <button key={n} type="button" onClick={() => onChange(n)} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)}
          style={{ fontSize: 32, background: 'none', border: 'none', cursor: 'pointer', color: (hover || value) >= n ? '#F59E0B' : C.border2, transition: 'all 0.12s', transform: hover === n ? 'scale(1.15)' : 'scale(1)' }}>★</button>
      ))}
    </div>
  );
}

function NpsInput({ value, onChange }) {
  return (
    <div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {Array.from({ length: 11 }, (_, i) => i).map(n => {
          const sel = value === n;
          const getBg = n => n <= 6 ? (sel ? C.danger : C.dangerLight) : n <= 8 ? (sel ? C.warning : C.warningLight) : (sel ? C.success : C.successLight);
          const getColor = n => n <= 6 ? C.danger : n <= 8 ? C.warning : C.success;
          return (
            <button key={n} type="button" onClick={() => onChange(n)}
              style={{
                width: 44, height: 44, borderRadius: 10, fontSize: 14, fontWeight: sel ? 700 : 500,
                fontFamily: 'Sora', cursor: 'pointer', border: `1.5px solid ${sel ? getColor(n) : C.border}`,
                background: getBg(n), color: getColor(n), transition: 'all 0.15s',
              }}>
              {n}
            </button>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
        <span style={{ fontSize: 11, color: C.text3 }}>Not likely</span>
        <span style={{ fontSize: 11, color: C.text3 }}>Very likely</span>
      </div>
    </div>
  );
}

function QuestionInput({ question: q, value, onChange }) {
  const optionStyle = (active) => ({
    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 10,
    border: `1.5px solid ${active ? C.accent : C.border}`, cursor: 'pointer',
    background: active ? C.accentLight : C.surface2, transition: 'all 0.15s',
    marginBottom: 8,
  });

  if (q.type === 'text') return (
    <textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={4} placeholder="Share your thoughts here..."
      style={{ width: '100%', padding: '12px 14px', fontSize: 14, fontFamily: 'DM Sans', color: C.text1, background: C.surface2, border: `1.5px solid ${C.border}`, borderRadius: 10, outline: 'none', resize: 'vertical', lineHeight: 1.6 }} />
  );

  if (q.type === 'rating_star') return <StarRating value={value || 0} onChange={onChange} />;
  if (q.type === 'nps') return <NpsInput value={value} onChange={onChange} />;

  if (q.type === 'rating_number') {
    const min = q.settings?.min || 1, max = q.settings?.max || 10;
    return (
      <div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {Array.from({ length: max - min + 1 }, (_, i) => i + min).map(n => (
            <button key={n} type="button" onClick={() => onChange(n)}
              style={{ width: 44, height: 44, borderRadius: 10, border: `1.5px solid ${value === n ? C.accent : C.border}`, background: value === n ? C.accentLight : C.surface2, color: value === n ? C.accent : C.text2, fontSize: 14, fontWeight: value === n ? 700 : 500, fontFamily: 'Sora', cursor: 'pointer', transition: 'all 0.15s' }}>
              {n}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          <span style={{ fontSize: 11, color: C.text3 }}>{min} — Lowest</span>
          <span style={{ fontSize: 11, color: C.text3 }}>{max} — Highest</span>
        </div>
      </div>
    );
  }

  if (q.type === 'radio' || q.type === 'likert') return (
    <div>
      {q.options.map(opt => (
        <label key={opt} style={optionStyle(value === opt)}>
          <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${value === opt ? C.accent : C.border2}`, background: value === opt ? C.accent : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {value === opt && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff' }} />}
          </div>
          <input type="radio" hidden value={opt} checked={value === opt} onChange={() => onChange(opt)} />
          <span style={{ fontSize: 14, color: value === opt ? C.accent : C.text1, fontWeight: value === opt ? 500 : 400 }}>{opt}</span>
        </label>
      ))}
    </div>
  );

  if (q.type === 'checkbox') return (
    <div>
      {q.options.map(opt => {
        const checked = Array.isArray(value) && value.includes(opt);
        return (
          <label key={opt} style={optionStyle(checked)} onClick={() => {
            const c = Array.isArray(value) ? value : [];
            onChange(checked ? c.filter(v => v !== opt) : [...c, opt]);
          }}>
            <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${checked ? C.accent : C.border2}`, background: checked ? C.accent : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11, color: '#fff' }}>
              {checked ? '✓' : ''}
            </div>
            <span style={{ fontSize: 14, color: checked ? C.accent : C.text1, fontWeight: checked ? 500 : 400 }}>{opt}</span>
          </label>
        );
      })}
    </div>
  );

  if (q.type === 'dropdown') return (
    <select value={value || ''} onChange={e => onChange(e.target.value)}
      style={{ width: '100%', padding: '10px 14px', fontSize: 14, fontFamily: 'DM Sans', color: value ? C.text1 : C.text3, background: C.surface2, border: `1.5px solid ${C.border}`, borderRadius: 10, outline: 'none', appearance: 'none', cursor: 'pointer' }}>
      <option value="">— Select an option —</option>
      {q.options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );

  return null;
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard',    icon: '⬡', roles: ['admin','creator','manager'] },
  { id: 'surveys',   label: 'Surveys',      icon: '📋', roles: ['admin','creator','manager'] },
  { id: 'links',     label: 'Survey Links', icon: '⛓', roles: ['admin','creator','manager'] },
  { id: 'analytics', label: 'Analytics',    icon: '◷',  roles: ['admin','creator','manager'] },
  { id: 'users',     label: 'Team',         icon: '◈',  roles: ['admin'] },
];

function Sidebar({ page, onNav, user, onLogout }) {
  return (
    <aside style={{
      width: 240, background: C.surface, borderRight: `1px solid ${C.border}`,
      display: 'flex', flexDirection: 'column', height: '100vh', position: 'sticky', top: 0, flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '22px 20px 18px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: `linear-gradient(135deg, ${C.accent} 0%, ${C.violet} 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 13, fontWeight: 800, fontFamily: 'Sora', letterSpacing: '-0.02em',
            boxShadow: `0 4px 12px ${C.accent}40`,
          }}>ES</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text1, fontFamily: 'Sora', letterSpacing: '-0.02em' }}>Elevate Survey</div>
            <div style={{ fontSize: 10, color: C.text3, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 500 }}>Enterprise</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
        <div style={{ marginBottom: 4 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: C.text3, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 10px', marginBottom: 2 }}>Workspace</div>
          {NAV_ITEMS.filter(n => n.roles.includes(user?.role)).map(item => {
            const active = page === item.id;
            return (
              <button key={item.id} onClick={() => onNav(item.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  background: active ? C.accentLight : 'transparent', marginBottom: 2,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = C.bg2; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
                <span style={{ fontSize: 16, opacity: active ? 1 : 0.6 }}>{item.icon}</span>
                <span style={{ fontSize: 13.5, fontWeight: active ? 600 : 400, color: active ? C.accent : C.text2, fontFamily: 'DM Sans', flex: 1, textAlign: 'left', letterSpacing: '-0.01em' }}>{item.label}</span>
                {active && <div style={{ width: 5, height: 5, borderRadius: '50%', background: C.accent, flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>
      </nav>

      {/* User */}
      <div style={{ padding: '12px 10px', borderTop: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, background: C.surface2, marginBottom: 6 }}>
          <Avatar name={user?.name || 'User'} size="sm" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
            <div style={{ fontSize: 11, color: C.text3, textTransform: 'capitalize' }}>{user?.role}</div>
          </div>
        </div>
        <button onClick={onLogout}
          style={{ width: '100%', padding: '8px 12px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, borderRadius: 8, color: C.text3, fontSize: 13, fontFamily: 'DM Sans' }}
          onMouseEnter={e => { e.currentTarget.style.background = C.dangerLight; e.currentTarget.style.color = C.danger; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.text3; }}>
          <span>⎋</span> Sign Out
        </button>
      </div>
    </aside>
  );
}

// ─── PAGE HEADER ──────────────────────────────────────────────────────────────
function PageHeader({ title, subtitle, actions, breadcrumb }) {
  return (
    <div style={{ padding: '28px 36px 0', marginBottom: 28 }}>
      {breadcrumb && <div style={{ fontSize: 12, color: C.text3, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>{breadcrumb}</div>}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text1, fontFamily: 'Sora', letterSpacing: '-0.03em', lineHeight: 1.2 }}>{title}</h1>
          {subtitle && <p style={{ fontSize: 14, color: C.text2, marginTop: 4 }}>{subtitle}</p>}
        </div>
        {actions && <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>{actions}</div>}
      </div>
    </div>
  );
}

// ─── LOGIN PAGE ───────────────────────────────────────────────────────────────
function LoginPage({ onLogin }) {
  const [email, setEmail]     = useState('');
  const [pw, setPw]           = useState('password123');
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState('');

  const demos = [
    { role: 'admin',   label: 'Admin',   email: 'admin@elevate.io',   icon: '🛡', desc: 'Full platform access' },
    { role: 'creator', label: 'Creator', email: 'creator@elevate.io', icon: '✦', desc: 'Build & manage surveys' },
    { role: 'manager', label: 'Manager', email: 'manager@elevate.io', icon: '◷', desc: 'View & analyze data' },
  ];

  const doLogin = async (loginEmail) => {
    setLoading(true); setErr('');
    await new Promise(r => setTimeout(r, 600));
    const e = loginEmail || email;
    const roleMap = { 'admin@elevate.io': 'admin', 'creator@elevate.io': 'creator', 'manager@elevate.io': 'manager' };
    const role = roleMap[e];
    if (!role) { setErr('Account not found. Please use a demo account.'); setLoading(false); return; }
    const names = { admin: 'Alex Morgan', creator: 'Jordan Lee', manager: 'Sam Rivera' };
    onLogin({ id: genId(), email: e, name: names[role], role });
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex' }}>
      {/* Left panel */}
      <div style={{ width: '48%', background: `linear-gradient(145deg, #1C1917 0%, #292524 50%, #1C1917 100%)`, padding: '48px 56px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
        {/* Decorative blobs */}
        <div style={{ position: 'absolute', top: -60, left: -60, width: 300, height: 300, borderRadius: '50%', background: C.accent, opacity: 0.08, filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', bottom: -80, right: -40, width: 360, height: 360, borderRadius: '50%', background: C.violet, opacity: 0.07, filter: 'blur(80px)' }} />
        {/* Grid pattern */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `radial-gradient(circle, rgba(255,255,255,.04) 1px, transparent 1px)`, backgroundSize: '28px 28px', pointerEvents: 'none' }} />

        <div style={{ position: 'relative' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 64 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: `linear-gradient(135deg, ${C.accent}, ${C.violet})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14, fontFamily: 'Sora', boxShadow: `0 8px 24px ${C.accent}50` }}>ES</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', fontFamily: 'Sora', letterSpacing: '-0.02em' }}>Elevate Survey</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Enterprise Platform</div>
            </div>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}>
            <h1 style={{ fontSize: 42, fontWeight: 800, color: '#fff', fontFamily: 'Sora', letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: 20 }}>
              Turn feedback<br/>
              <span style={{ background: `linear-gradient(90deg, #818CF8, #C084FC)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>into decisions.</span>
            </h1>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,.5)', lineHeight: 1.7, marginBottom: 48, maxWidth: 340 }}>Enterprise survey platform with AI-powered insights, real-time analytics, and beautiful reports.</p>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[['🤖', 'AI-powered deep insights'], ['⚡', 'Real-time response tracking'], ['🔐', 'Enterprise-grade security'], ['📊', 'Beautiful analytics & exports']].map(([icon, text], i) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>{icon}</div>
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,.65)' }}>{text}</span>
              </div>
            ))}
          </motion.div>
        </div>

        <div style={{ position: 'relative', fontSize: 12, color: 'rgba(255,255,255,.25)' }}>© 2024 Elevate Survey. All rights reserved.</div>
      </div>

      {/* Right form panel */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: C.text1, fontFamily: 'Sora', letterSpacing: '-0.03em', marginBottom: 6 }}>Welcome back</h2>
            <p style={{ fontSize: 14, color: C.text2 }}>Sign in to your workspace</p>
          </div>

          <form onSubmit={e => { e.preventDefault(); doLogin(); }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Input label="Work Email" type="email" value={email} onChange={setEmail} placeholder="you@company.com" required />
            <Input label="Password" type="password" value={pw} onChange={setPw} placeholder="••••••••" required />
            {err && (
              <div style={{ padding: '10px 14px', background: C.dangerLight, border: `1px solid #FECACA`, borderRadius: 10, fontSize: 13, color: C.danger }}>{err}</div>
            )}
            <Btn type="submit" size="lg" loading={loading} className="w-full" style={{ width: '100%', marginTop: 4 }}>
              {loading ? 'Signing in…' : 'Sign In →'}
            </Btn>
          </form>

          <div style={{ margin: '28px 0 20px' }}><Divider label="Quick access" /></div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {demos.map(d => (
              <button key={d.role} onClick={() => doLogin(d.email)}
                style={{ padding: '14px 10px', background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 12, cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.boxShadow = `0 0 0 3px ${C.accentLight}`; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = 'none'; }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>{d.icon}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text1, fontFamily: 'Sora' }}>{d.label}</div>
                <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>{d.desc}</div>
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
const MOCK_WEEK   = [{d:'Mon',r:34},{d:'Tue',r:52},{d:'Wed',r:41},{d:'Thu',r:68},{d:'Fri',r:45},{d:'Sat',r:12},{d:'Sun',r:8}];
const MOCK_SAT    = [{name:'Very Satisfied',v:38},{name:'Satisfied',v:42},{name:'Neutral',v:12},{name:'Dissatisfied',v:6},{name:'Very Dissatisfied',v:2}];
const MOCK_RADAR  = [{m:'Work Env',s:4.2},{m:'Management',s:3.8},{m:'Growth',s:3.5},{m:'Culture',s:4.5},{m:'Benefits',s:4.0},{m:'Balance',s:3.9}];
const MOCK_DEPT   = [{d:'Dept A',v:89},{d:'Dept B',v:67},{d:'Dept C',v:52},{d:'Dept D',v:39}];

function DashboardPage({ user, surveys, links, onNav }) {
  const totalResp = surveys.reduce((a, s) => a + (s.responses || 0), 0);
  const activeLinks = links.filter(l => l.status === 'active').length;

  const insightCards = [
    { icon: '✅', label: 'Strong Culture', detail: '85% rated culture 4★+ — 12% above industry benchmark.', color: C.success, light: C.successLight },
    { icon: '📈', label: 'Growth Trend', detail: 'Response rate up 23% this month. Engagement is improving.', color: C.accent, light: C.accentLight },
    { icon: '⚠️', label: 'Action Needed', detail: 'Career growth scores dropped 0.7 pts. Consider mentorship programs.', color: C.warning, light: C.warningLight },
  ];

  return (
    <div style={{ padding: '0 0 40px' }}>
      <PageHeader
        title={`Good morning, ${user?.name?.split(' ')[0]} 👋`}
        subtitle="Here's what's happening with your surveys today."
      />
      <div style={{ padding: '0 36px' }}>

        {/* Stats */}
        <motion.div variants={stagger} initial="hidden" animate="show"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
          <StatCard label="Total Surveys"    value={surveys.length}              icon="📋" delta={8}  accent={C.accent}  />
          <StatCard label="Total Responses"  value={totalResp.toLocaleString()}  icon="💬" delta={23} accent={C.violet}  />
          <StatCard label="Active Links"     value={activeLinks}                 icon="⛓" delta={-5} accent={C.teal}    />
          <StatCard label="Avg. Completion"  value="87%"                         icon="✓"  delta={4}  accent={C.success} />
        </motion.div>

        {/* Charts row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          <Card>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.text1, fontFamily: 'Sora', letterSpacing: '-0.02em' }}>Responses This Week</div>
              <div style={{ fontSize: 12, color: C.text3, marginTop: 3 }}>Daily response volume</div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={MOCK_WEEK} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.accent} stopOpacity={0.15} />
                    <stop offset="100%" stopColor={C.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                <XAxis dataKey="d" tick={{ fontSize: 11, fill: C.text3, fontFamily: 'DM Sans' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: C.text3 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="r" stroke={C.accent} strokeWidth={2.5} fill="url(#areaGrad)" dot={false} activeDot={{ r: 5, fill: C.accent, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.text1, fontFamily: 'Sora', letterSpacing: '-0.02em' }}>Satisfaction Distribution</div>
              <div style={{ fontSize: 12, color: C.text3, marginTop: 3 }}>Across all active surveys</div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={MOCK_SAT} dataKey="v" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={48} paddingAngle={3}>
                  {MOCK_SAT.map((_, i) => <Cell key={i} fill={CHART_PALETTE[i]} strokeWidth={0} />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: C.text2, fontFamily: 'DM Sans' }} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Bottom row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20 }}>
          {/* Recent surveys */}
          <Card padding="0" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.text1, fontFamily: 'Sora', letterSpacing: '-0.02em' }}>Recent Surveys</div>
              <Btn variant="ghost" size="sm" onClick={() => onNav('surveys')}>View all →</Btn>
            </div>
            {surveys.slice(0, 4).map((s, i) => (
              <div key={s.id} style={{ padding: '16px 24px', borderBottom: i < 3 ? `1px solid ${C.border}` : 'none', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: C.accentLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>📋</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500, color: C.text1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>{s.title}</div>
                  <div style={{ fontSize: 12, color: C.text3 }}>{s.responses || 0} responses · {s.links || 0} links</div>
                </div>
                <Badge status={s.status} />
              </div>
            ))}
          </Card>

          {/* AI Insights preview */}
          <Card>
            <div style={{ fontSize: 15, fontWeight: 600, color: C.text1, fontFamily: 'Sora', letterSpacing: '-0.02em', marginBottom: 4 }}>🤖 AI Insights</div>
            <div style={{ fontSize: 12, color: C.text3, marginBottom: 18 }}>Key findings from your data</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {insightCards.map((ins, i) => (
                <div key={i} style={{ padding: '12px 14px', borderRadius: 12, background: ins.light, border: `1px solid ${ins.color}20`, display: 'flex', gap: 10 }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{ins.icon}</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: ins.color, marginBottom: 3 }}>{ins.label}</div>
                    <div style={{ fontSize: 12, color: C.text2, lineHeight: 1.5 }}>{ins.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── SURVEYS PAGE ─────────────────────────────────────────────────────────────
function SurveysPage({ user, surveys, onNew, onEdit, onViewAnalytics, onToggle, onDelete }) {
  const [q, setQ]         = useState('');
  const [filter, setFilter] = useState('all');
  const canEdit = ['admin','creator'].includes(user?.role);
  const filtered = surveys.filter(s =>
    s.title.toLowerCase().includes(q.toLowerCase()) && (filter === 'all' || s.status === filter)
  );

  return (
    <div style={{ paddingBottom: 40 }}>
      <PageHeader
        title="Surveys"
        subtitle={`${surveys.length} surveys in your workspace`}
        actions={canEdit && <Btn onClick={onNew} icon="+" size="md">New Survey</Btn>}
      />
      <div style={{ padding: '0 36px' }}>
        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '0 0 220px' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: C.text3 }}>🔍</span>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search surveys…"
              style={{ width: '100%', paddingLeft: 34, paddingRight: 14, height: 38, fontSize: 13, fontFamily: 'DM Sans', color: C.text1, background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 10, outline: 'none' }} />
          </div>
          <Divider />
          {['all','active','paused','draft','closed'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding: '7px 14px', borderRadius: 9, fontSize: 12.5, fontWeight: filter === f ? 600 : 400, fontFamily: 'DM Sans', cursor: 'pointer', border: `1.5px solid ${filter === f ? C.accent : C.border}`, background: filter === f ? C.accentLight : C.surface, color: filter === f ? C.accent : C.text2, transition: 'all 0.15s', textTransform: 'capitalize' }}>
              {f}
            </button>
          ))}
        </div>

        {/* Survey cards */}
        {filtered.length === 0
          ? <EmptyState icon="📭" title="No surveys found" desc="Try adjusting your search or create a new survey." action={canEdit && <Btn onClick={onNew} icon="+">Create Survey</Btn>} />
          : (
          <motion.div variants={stagger} initial="hidden" animate="show" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map(s => {
              const totalQ = s.sections?.reduce((a, sec) => a + sec.questions.length, 0) || 0;
              return (
                <motion.div key={s.id} variants={fadeUp}>
                  <Card hover style={{ padding: 0, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                      {/* Left accent strip */}
                      <div style={{ width: 4, alignSelf: 'stretch', background: s.status === 'active' ? C.success : s.status === 'paused' ? C.warning : C.border2, flexShrink: 0 }} />
                      <div style={{ padding: '18px 24px', flex: 1, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: 240 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 15, fontWeight: 600, color: C.text1, fontFamily: 'Sora', letterSpacing: '-0.02em' }}>{s.title}</span>
                            <Badge status={s.status} />
                          </div>
                          <div style={{ fontSize: 12.5, color: C.text3, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                            <span>📋 {s.sections?.length || 0} sections · {totalQ} questions</span>
                            <span>💬 {s.responses || 0} responses</span>
                            <span>⛓ {s.links || 0} links</span>
                            <span>📅 {s.createdAt}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
                          <Btn variant="ghost" size="sm" onClick={() => onViewAnalytics(s.id)} icon="◷">Analytics</Btn>
                          {canEdit && <>
                            <Btn variant="secondary" size="sm" onClick={() => onEdit(s.id)} icon="✦">Edit</Btn>
                            <Btn variant={s.status === 'active' ? 'secondary' : 'success'} size="sm" onClick={() => onToggle(s.id)}>
                              {s.status === 'active' ? '⏸ Pause' : '▶ Resume'}
                            </Btn>
                            {user?.role === 'admin' && <Btn variant="danger" size="sm" onClick={() => onDelete(s.id)}>🗑</Btn>}
                          </>}
                        </div>
                      </div>
                    </div>
                    {(s.responses > 0) && (
                      <div style={{ padding: '0 24px 14px 28px' }}>
                        <LinearProgress value={Math.min(100, Math.round((s.responses / Math.max(1, (s.links || 1) * 50)) * 100))} color={C.success} height={3} showPct={false} />
                      </div>
                    )}
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ─── SURVEY BUILDER ───────────────────────────────────────────────────────────
function QuestionCard({ q, idx, total, onUpdate, onDelete, onMove }) {
  const [open, setOpen] = useState(true);
  const type = QUESTION_TYPES.find(t => t.id === q.type);

  return (
    <motion.div variants={fadeUp} layout>
      <Card padding="0" style={{ overflow: 'hidden', marginBottom: 10 }}>
        {/* Header */}
        <div onClick={() => setOpen(p => !p)} style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', background: open ? C.surface : C.surface2 }}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: C.accentLight, color: C.accent, fontSize: 12, fontWeight: 700, fontFamily: 'Sora', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{idx + 1}</div>
          <span style={{ fontSize: 16, color: C.text2 }}>{type?.icon}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 500, color: C.text1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.text || <span style={{ color: C.text3, fontStyle: 'italic' }}>Untitled question</span>}</div>
            <div style={{ fontSize: 11, color: C.text3 }}>{type?.label}{q.required ? ' · Required' : ' · Optional'}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }} onClick={e => e.stopPropagation()}>
            <button onClick={() => onMove(-1)} disabled={idx === 0} style={{ width: 26, height: 26, border: 'none', background: 'none', cursor: idx === 0 ? 'not-allowed' : 'pointer', opacity: idx === 0 ? 0.3 : 0.6, fontSize: 12, color: C.text2 }}>▲</button>
            <button onClick={() => onMove(1)} disabled={idx === total - 1} style={{ width: 26, height: 26, border: 'none', background: 'none', cursor: idx === total - 1 ? 'not-allowed' : 'pointer', opacity: idx === total - 1 ? 0.3 : 0.6, fontSize: 12, color: C.text2 }}>▼</button>
            <button onClick={onDelete} style={{ width: 26, height: 26, border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, color: C.text3 }}
              onMouseEnter={e => e.currentTarget.style.color = C.danger} onMouseLeave={e => e.currentTarget.style.color = C.text3}>🗑</button>
            <span style={{ fontSize: 11, color: C.text3, marginLeft: 4 }}>{open ? '▲' : '▼'}</span>
          </div>
        </div>

        {/* Body */}
        <AnimatePresence>
          {open && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }}>
              <div style={{ padding: '16px 18px 18px', borderTop: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Textarea label="Question text" value={q.text} onChange={v => onUpdate({ text: v })} placeholder="Type your question here…" rows={2} />
                {['radio','checkbox','dropdown'].includes(q.type) && (
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: C.text2, marginBottom: 8 }}>Answer Options</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {(q.options || []).map((o, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8 }}>
                          <input value={o} onChange={e => onUpdate({ options: q.options.map((op, oi) => oi === i ? e.target.value : op) })} placeholder={`Option ${i + 1}`}
                            style={{ flex: 1, padding: '8px 12px', fontSize: 13, fontFamily: 'DM Sans', color: C.text1, background: C.surface2, border: `1.5px solid ${C.border}`, borderRadius: 8, outline: 'none' }} />
                          <button onClick={() => onUpdate({ options: q.options.filter((_, oi) => oi !== i) })} style={{ width: 32, height: 34, border: 'none', background: C.surface2, borderRadius: 8, cursor: 'pointer', fontSize: 13, color: C.text3 }}
                            onMouseEnter={e => { e.currentTarget.style.background = C.dangerLight; e.currentTarget.style.color = C.danger; }} onMouseLeave={e => { e.currentTarget.style.background = C.surface2; e.currentTarget.style.color = C.text3; }}>✕</button>
                        </div>
                      ))}
                      <button onClick={() => onUpdate({ options: [...(q.options || []), `Option ${(q.options || []).length + 1}`] })}
                        style={{ alignSelf: 'flex-start', fontSize: 12.5, color: C.accent, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}>+ Add option</button>
                    </div>
                  </div>
                )}
                {q.type === 'rating_number' && (
                  <div style={{ display: 'flex', gap: 16 }}>
                    <Input label="Min value" type="number" value={q.settings?.min || 1} onChange={v => onUpdate({ settings: { ...q.settings, min: Number(v) } })} />
                    <Input label="Max value" type="number" value={q.settings?.max || 10} onChange={v => onUpdate({ settings: { ...q.settings, max: Number(v) } })} />
                  </div>
                )}
                {q.type === 'likert' && (
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 500, color: C.text2, display: 'block', marginBottom: 8 }}>Likert Scale Options</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {LIKERT_OPTIONS.map(o => <span key={o} style={{ padding: '4px 10px', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12, color: C.text2 }}>{o}</span>)}
                    </div>
                  </div>
                )}
                <Toggle value={q.required} onChange={v => onUpdate({ required: v })} label="Required question" size="sm" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

function SurveyBuilderPage({ survey, onSave, onCancel }) {
  const [title, setTitle]     = useState(survey?.title || '');
  const [desc, setDesc]       = useState(survey?.description || '');
  const [sections, setSections] = useState(survey?.sections || [{ id: genId(), title: 'Section 1', questions: [] }]);
  const [activeSec, setActiveSec] = useState(0);
  const [typeModal, setTypeModal] = useState(false);
  const [saving, setSaving]   = useState(false);

  const sec = sections[activeSec];
  const totalQ = sections.reduce((a, s) => a + s.questions.length, 0);

  const addSection = () => { setSections(p => [...p, { id: genId(), title: `Section ${p.length + 1}`, questions: [] }]); setActiveSec(sections.length); };
  const updateSecTitle = (i, t) => setSections(p => p.map((s, si) => si === i ? { ...s, title: t } : s));
  const addQ = (type) => {
    const q = { id: genId(), type, text: '', required: true, options: type === 'likert' ? [...LIKERT_OPTIONS] : ['radio','checkbox','dropdown'].includes(type) ? ['Option 1','Option 2','Option 3'] : [], settings: type === 'rating_number' ? { min: 1, max: 10 } : {} };
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

  return (
    <div style={{ paddingBottom: 40 }}>
      <PageHeader
        title={survey ? 'Edit Survey' : 'New Survey'}
        subtitle={`${totalQ} questions across ${sections.length} section${sections.length !== 1 ? 's' : ''}`}
        actions={<>
          <Btn variant="secondary" onClick={onCancel}>Cancel</Btn>
          <Btn onClick={() => { setSaving(true); setTimeout(() => { onSave({ title, description: desc, sections }); setSaving(false); }, 600); }} disabled={!title} loading={saving}>Save Survey</Btn>
        </>}
      />
      <div style={{ padding: '0 36px' }}>
        {/* Meta card */}
        <Card style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Input label="Survey Title" value={title} onChange={setTitle} placeholder="e.g. Employee Satisfaction Q4 2024" required />
            <Textarea label="Description" value={desc} onChange={setDesc} placeholder="What is this survey about?" rows={2} />
          </div>
        </Card>

        {/* Section tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          {sections.map((s, i) => (
            <button key={s.id} onClick={() => setActiveSec(i)}
              style={{ padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: activeSec === i ? 600 : 400, fontFamily: 'DM Sans', cursor: 'pointer', border: `1.5px solid ${activeSec === i ? C.accent : C.border}`, background: activeSec === i ? C.accentLight : C.surface, color: activeSec === i ? C.accent : C.text2, transition: 'all 0.15s' }}>
              {s.title} <span style={{ opacity: 0.5, fontSize: 11 }}>({s.questions.length})</span>
            </button>
          ))}
          <button onClick={addSection}
            style={{ padding: '8px 16px', borderRadius: 10, fontSize: 13, fontFamily: 'DM Sans', cursor: 'pointer', border: `1.5px dashed ${C.border2}`, background: 'transparent', color: C.text3, transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border2; e.currentTarget.style.color = C.text3; }}>
            + Add Section
          </button>
        </div>

        {/* Section editor */}
        <Card>
          <div style={{ marginBottom: 20 }}>
            <Input label="Section Title" value={sec?.title || ''} onChange={v => updateSecTitle(activeSec, v)} placeholder="Section name…" />
          </div>

          <motion.div variants={stagger} initial="hidden" animate="show">
            {sec?.questions?.map((q, qi) => (
              <QuestionCard key={q.id} q={q} idx={qi} total={sec.questions.length} onUpdate={upd => updQ(q.id, upd)} onDelete={() => delQ(q.id)} onMove={dir => moveQ(q.id, dir)} />
            ))}
          </motion.div>

          <button onClick={() => setTypeModal(true)}
            style={{ width: '100%', padding: '14px', border: `2px dashed ${C.border}`, borderRadius: 12, background: 'transparent', cursor: 'pointer', fontSize: 14, color: C.text3, fontFamily: 'DM Sans', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8, transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; e.currentTarget.style.background = C.accentLight; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.text3; e.currentTarget.style.background = 'transparent'; }}>
            <span style={{ fontSize: 20, fontWeight: 300 }}>+</span> Add Question
          </button>
        </Card>
      </div>

      <Modal open={typeModal} onClose={() => setTypeModal(false)} title="Choose Question Type" subtitle="Select the type that best fits your question" size="lg">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {QUESTION_TYPES.map(qt => (
            <button key={qt.id} onClick={() => addQ(qt.id)}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '16px', background: C.surface2, border: `1.5px solid ${C.border}`, borderRadius: 12, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.background = C.accentLight; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = C.surface2; }}>
              <span style={{ fontSize: 28, flexShrink: 0, lineHeight: 1 }}>{qt.icon}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text1, fontFamily: 'Sora', marginBottom: 3 }}>{qt.label}</div>
                <div style={{ fontSize: 12, color: C.text3 }}>{qt.desc}</div>
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
  const totalQ      = survey?.sections?.reduce((a, s) => a + s.questions.length, 0) || 0;
  const [secIdx, setSecIdx]   = useState(0);
  const [answers, setAnswers] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`draft_${token}`) || '{}'); } catch { return {}; }
  });
  const [submitted, setSubmitted] = useState(false);
  const responseId = useRef(genId());

  useEffect(() => {
    const n = Object.keys(answers).length;
    if (n > 0 && n % 3 === 0) localStorage.setItem(`draft_${token}`, JSON.stringify(answers));
  }, [answers, token]);

  if (!survey) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🔗</div>
        <div style={{ fontSize: 20, fontWeight: 600, color: C.text1, fontFamily: 'Sora', marginBottom: 6 }}>Survey Not Found</div>
        <p style={{ color: C.text2, fontSize: 14 }}>This link may be invalid or expired.</p>
      </div>
    </div>
  );

  if (submitted) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ textAlign: 'center', maxWidth: 420 }}>
        <div style={{ width: 88, height: 88, borderRadius: '50%', background: C.successLight, border: `2px solid ${C.success}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, margin: '0 auto 24px' }}>✓</div>
        <h2 style={{ fontSize: 32, fontWeight: 700, color: C.text1, fontFamily: 'Sora', letterSpacing: '-0.03em', marginBottom: 8 }}>All done!</h2>
        <p style={{ fontSize: 16, color: C.text2, lineHeight: 1.6 }}>Your responses have been saved. Thank you for your time!</p>
        {onComplete && <div style={{ marginTop: 24 }}><Btn variant="secondary" onClick={onComplete}>← Go back</Btn></div>}
      </motion.div>
    </div>
  );

  const secs    = survey.sections || [];
  const sec     = secs[secIdx];
  const answered = Object.keys(answers).length;
  const pct     = totalQ > 0 ? Math.round((answered / totalQ) * 100) : 0;
  const isLast  = secIdx === secs.length - 1;
  const canNext = sec?.questions?.filter(q => q.required).every(q => {
    const v = answers[q.id];
    return v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0);
  });

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      {/* Sticky header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(247,245,242,.92)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${C.border}`, padding: '14px 24px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text1, fontFamily: 'Sora' }}>{survey.title}</div>
              <div style={{ fontSize: 12, color: C.text3, marginTop: 2 }}>Section {secIdx + 1} of {secs.length}: {sec?.title}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ProgressRing value={pct} size={40} stroke={3.5} color={C.accent} />
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.text1, fontFamily: 'Sora', lineHeight: 1 }}>{pct}%</div>
                  <div style={{ fontSize: 10, color: C.text3 }}>{answered}/{totalQ} done</div>
                </div>
              </div>
            </div>
          </div>
          {/* Progress bar */}
          <div style={{ height: 3, background: C.border, borderRadius: 99, overflow: 'hidden' }}>
            <motion.div animate={{ width: `${pct}%` }} transition={{ duration: 0.4 }}
              style={{ height: '100%', background: `linear-gradient(90deg, ${C.accent}, ${C.violet})`, borderRadius: 99 }} />
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '36px 24px 80px' }}>
        <AnimatePresence mode="wait">
          <motion.div key={secIdx} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text1, fontFamily: 'Sora', letterSpacing: '-0.02em', marginBottom: 24 }}>{sec?.title}</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {sec?.questions?.map((q, qi) => (
                <motion.div key={q.id} variants={fadeUp} initial="hidden" animate="show" transition={{ delay: qi * 0.05 }}>
                  <Card>
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: C.accent, fontFamily: 'Sora', marginTop: 2, flexShrink: 0 }}>Q{qi + 1}.</span>
                        <p style={{ fontSize: 15, fontWeight: 500, color: C.text1, lineHeight: 1.5 }}>
                          {q.text}{q.required && <span style={{ color: C.danger, marginLeft: 3 }}>*</span>}
                        </p>
                      </div>
                    </div>
                    <QuestionInput question={q} value={answers[q.id]} onChange={v => setAnswers(p => ({ ...p, [q.id]: v }))} />
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32, paddingTop: 24, borderTop: `1px solid ${C.border}` }}>
          <Btn variant="secondary" onClick={() => setSecIdx(p => Math.max(0, p - 1))} disabled={secIdx === 0}>← Previous</Btn>
          {isLast
            ? <Btn onClick={() => { localStorage.removeItem(`draft_${token}`); setSubmitted(true); }} disabled={!canNext}>Submit Survey ✓</Btn>
            : <Btn onClick={() => setSecIdx(p => p + 1)} disabled={!canNext}>Next Section →</Btn>
          }
        </div>
      </div>
    </div>
  );
}

// ─── ANALYTICS ────────────────────────────────────────────────────────────────
function AnalyticsPage({ survey }) {
  const [aiLoading, setAiLoading] = useState(false);
  const nps = { promoters: 56, passives: 28, detractors: 16, score: 40 };

  const insights = [
    { icon: '✅', label: 'Strong Culture Score', detail: '85% rated culture 4★+ — 12% above industry benchmark.', color: C.success, light: C.successLight },
    { icon: '⚠️', label: 'Career Growth Decline', detail: 'Scores dropped 0.7pts from Q3. Consider mentorship & clearer promotion paths.', color: C.warning, light: C.warningLight },
    { icon: '💡', label: 'Hybrid Work Preference', detail: '67% prefer 1–4 day hybrid. Formalizing policy could improve retention by ~18%.', color: C.accent, light: C.accentLight },
    { icon: '🚀', label: 'High-Impact Action', detail: 'Employees with clear growth paths are 3× more likely to stay long-term.', color: C.violet, light: C.violetLight },
  ];

  return (
    <div style={{ paddingBottom: 40 }}>
      <PageHeader
        title="Analytics"
        subtitle={survey?.title || 'Employee Satisfaction Q4 2024'}
        actions={<>
          <Btn variant="secondary" size="sm" onClick={() => exportCSV(MOCK_WEEK.map(d => ({ Day: d.d, Responses: d.r })), 'responses.csv')} icon="↓">Export CSV</Btn>
          <Btn variant="secondary" size="sm" icon="↓">Export PDF</Btn>
        </>}
      />
      <div style={{ padding: '0 36px' }}>

        {/* KPIs */}
        <motion.div variants={stagger} initial="hidden" animate="show" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 28 }}>
          <StatCard label="Total Responses" value="247"    icon="💬" delta={23} accent={C.accent} />
          <StatCard label="Completion Rate" value="87%"    icon="✓"  delta={4}  accent={C.success} />
          <StatCard label="Avg. Rating"     value="4.2★"   icon="★"  delta={2}  accent={C.warning} />
          <StatCard label="NPS Score"       value={nps.score} icon="◐" delta={8} accent={C.violet} />
        </motion.div>

        {/* Charts */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          <Card>
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.text1, fontFamily: 'Sora', letterSpacing: '-0.02em' }}>Daily Responses</div>
              <div style={{ fontSize: 12, color: C.text3, marginTop: 2 }}>Response volume trend</div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={MOCK_WEEK} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="ag2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.accent} stopOpacity={0.15} />
                    <stop offset="100%" stopColor={C.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                <XAxis dataKey="d" tick={{ fontSize: 11, fill: C.text3 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: C.text3 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="r" stroke={C.accent} strokeWidth={2.5} fill="url(#ag2)" dot={false} activeDot={{ r: 5, fill: C.accent, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.text1, fontFamily: 'Sora', letterSpacing: '-0.02em' }}>By Department</div>
              <div style={{ fontSize: 12, color: C.text3, marginTop: 2 }}>Response distribution</div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={MOCK_DEPT} layout="vertical" barSize={20} margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: C.text3 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="d" tick={{ fontSize: 11, fill: C.text3 }} axisLine={false} tickLine={false} width={60} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="v" fill={C.violet} radius={[0,8,8,0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.text1, fontFamily: 'Sora', letterSpacing: '-0.02em' }}>Satisfaction Breakdown</div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={MOCK_SAT} dataKey="v" nameKey="name" cx="50%" cy="50%" outerRadius={85} innerRadius={52} paddingAngle={3}>
                  {MOCK_SAT.map((_, i) => <Cell key={i} fill={CHART_PALETTE[i]} strokeWidth={0} />)}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: C.text2 }} />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.text1, fontFamily: 'Sora', letterSpacing: '-0.02em' }}>Category Scores</div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={MOCK_RADAR}>
                <PolarGrid stroke={C.border} />
                <PolarAngleAxis dataKey="m" tick={{ fill: C.text3, fontSize: 11 }} />
                <Radar dataKey="s" stroke={C.accent} fill={C.accent} fillOpacity={0.12} strokeWidth={2} />
                <Tooltip content={<ChartTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* NPS */}
        <Card style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: C.text1, fontFamily: 'Sora', marginBottom: 18 }}>Net Promoter Score</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 180px', gap: 16, marginBottom: 16 }}>
            {[{l:'Promoters',v:nps.promoters,c:C.success,bg:C.successLight},{l:'Passives',v:nps.passives,c:C.warning,bg:C.warningLight},{l:'Detractors',v:nps.detractors,c:C.danger,bg:C.dangerLight}].map(x => (
              <div key={x.l} style={{ padding: '16px', background: x.bg, borderRadius: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 26, fontWeight: 700, color: C.text1, fontFamily: 'Sora' }}>{x.v}%</div>
                <div style={{ fontSize: 13, color: x.c, fontWeight: 500, marginTop: 2 }}>{x.l}</div>
              </div>
            ))}
            <div style={{ padding: 16, background: C.accentLight, borderRadius: 12, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: C.accent, fontFamily: 'Sora' }}>{nps.score}</div>
              <div style={{ fontSize: 12, color: C.text2, marginTop: 4 }}>NPS Score</div>
            </div>
          </div>
          <div style={{ height: 8, background: C.border, borderRadius: 99, overflow: 'hidden', display: 'flex', gap: 2 }}>
            {[{w:nps.promoters,c:C.success},{w:nps.passives,c:C.warning},{w:nps.detractors,c:C.danger}].map((x,i) => (
              <motion.div key={i} initial={{ width: 0 }} animate={{ width: `${x.w}%` }} transition={{ duration: 0.8, delay: i * 0.1 }} style={{ height: '100%', background: x.c, borderRadius: 99 }} />
            ))}
          </div>
        </Card>

        {/* Section completion */}
        <Card style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: C.text1, fontFamily: 'Sora', marginBottom: 20 }}>Section Completion Rates</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[{s:'Work Environment',v:94},{s:'Career Growth',v:87},{s:'Management',v:91}].map(item => (
              <LinearProgress key={item.s} value={item.v} label={item.s} color={C.accent} />
            ))}
          </div>
        </Card>

        {/* AI Insights */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: C.text1, fontFamily: 'Sora', letterSpacing: '-0.02em' }}>🤖 AI-Powered Insights</div>
              <div style={{ fontSize: 12, color: C.text3, marginTop: 3 }}>Deep analysis generated by Claude AI — updated on demand</div>
            </div>
            <Btn variant="secondary" size="sm" onClick={() => { setAiLoading(true); setTimeout(() => setAiLoading(false), 1800); }}>↺ Regenerate</Btn>
          </div>

          {aiLoading ? (
            <Card style={{ padding: '48px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 32, marginBottom: 12, animation: 'spin 1s linear infinite', display: 'inline-block' }}>⚙</div>
              <div style={{ fontSize: 14, color: C.text2 }}>Claude is analysing your survey data…</div>
            </Card>
          ) : (
            <motion.div variants={stagger} initial="hidden" animate="show" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {insights.map((ins, i) => (
                <motion.div key={i} variants={fadeUp}>
                  <div style={{ padding: '18px 20px', borderRadius: 16, background: ins.light, border: `1px solid ${ins.color}20`, display: 'flex', gap: 14 }}>
                    <span style={{ fontSize: 24, flexShrink: 0 }}>{ins.icon}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: ins.color, marginBottom: 6 }}>{ins.label}</div>
                      <p style={{ fontSize: 13, color: C.text2, lineHeight: 1.6 }}>{ins.detail}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── USERS PAGE ───────────────────────────────────────────────────────────────
function UsersPage({ users, onAdd, onUpdate, onRemove }) {
  const [modal, setModal] = useState(false);
  const [form, setForm]   = useState({ name: '', email: '', role: 'creator' });

  return (
    <div style={{ paddingBottom: 40 }}>
      <PageHeader title="Team Management" subtitle={`${users.length} members`} actions={<Btn onClick={() => setModal(true)} icon="✉">Invite Member</Btn>} />
      <div style={{ padding: '0 36px' }}>
        <Card padding="0" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {['Member','Email','Role','Status','Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 20px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: C.text3, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'DM Sans' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id} style={{ borderBottom: i < users.length - 1 ? `1px solid ${C.border}` : 'none' }}
                  onMouseEnter={e => e.currentTarget.style.background = C.surface2} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar name={u.name} size="sm" />
                      <span style={{ fontSize: 14, fontWeight: 500, color: C.text1 }}>{u.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: 13, color: C.text2 }}>{u.email}</td>
                  <td style={{ padding: '14px 20px' }}>
                    <select value={u.role} onChange={e => onUpdate(u.id, { role: e.target.value })}
                      style={{ padding: '5px 10px', fontSize: 12, fontFamily: 'DM Sans', color: C.text1, background: C.surface2, border: `1.5px solid ${C.border}`, borderRadius: 7, outline: 'none', cursor: 'pointer' }}>
                      <option value="admin">Admin</option>
                      <option value="creator">Creator</option>
                      <option value="manager">Manager</option>
                    </select>
                  </td>
                  <td style={{ padding: '14px 20px' }}><Badge status={u.status} /></td>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Btn variant="ghost" size="xs" onClick={() => onUpdate(u.id, { status: u.status === 'active' ? 'inactive' : 'active' })}>{u.status === 'active' ? 'Deactivate' : 'Activate'}</Btn>
                      <Btn variant="danger" size="xs" onClick={() => onRemove(u.id)}>Remove</Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Invite Team Member" subtitle="They'll receive an email with login instructions"
        footer={<><Btn variant="secondary" onClick={() => setModal(false)}>Cancel</Btn><Btn onClick={() => { if (!form.name || !form.email) return; onAdd({ ...form, id: genId(), status: 'active' }); setModal(false); setForm({ name: '', email: '', role: 'creator' }); }}>Send Invite</Btn></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input label="Full Name" value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} placeholder="Jane Smith" required />
          <Input label="Work Email" type="email" value={form.email} onChange={v => setForm(p => ({ ...p, email: v }))} placeholder="jane@company.com" required />
          <SelectField label="Role" value={form.role} onChange={v => setForm(p => ({ ...p, role: v }))}
            options={[{ value: 'creator', label: 'Survey Creator' }, { value: 'manager', label: 'Survey Manager' }, { value: 'admin', label: 'Admin' }]} />
        </div>
      </Modal>
    </div>
  );
}

// ─── LINKS PAGE ───────────────────────────────────────────────────────────────
function LinksPage({ user, surveys, links, onAdd, onRemove, onCopy }) {
  const [modal, setModal] = useState(false);
  const [form, setForm]   = useState({ surveyId: surveys[0]?.id || '', email: '' });
  const canManage = ['admin','creator'].includes(user?.role);
  const getTitle  = id => surveys.find(s => s.id === id)?.title || 'Unknown Survey';

  return (
    <div style={{ paddingBottom: 40 }}>
      <PageHeader
        title="Survey Links"
        subtitle="Unique links with click & response tracking per recipient"
        actions={canManage && <Btn onClick={() => setModal(true)} icon="⛓">Generate Link</Btn>}
      />
      <div style={{ padding: '0 36px' }}>
        <motion.div variants={stagger} initial="hidden" animate="show" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
          <StatCard label="Total Links"     value={links.length}                                              icon="⛓" accent={C.accent}  />
          <StatCard label="Total Clicks"    value={links.reduce((a,l) => a + (l.clicks||0), 0).toLocaleString()} icon="↗" accent={C.violet}  />
          <StatCard label="Total Responses" value={links.reduce((a,l) => a + (l.responses||0), 0)}             icon="💬" accent={C.success} />
        </motion.div>

        <Card padding="0" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}`, background: C.surface2 }}>
                  {['Recipient','Survey','Clicks','Responses','Conversion','Status',''].map(h => (
                    <th key={h} style={{ padding: '11px 18px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: C.text3, letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {links.map((link, i) => {
                  const conv = (link.clicks || 0) > 0 ? Math.round(((link.responses||0) / link.clicks) * 100) : 0;
                  return (
                    <tr key={link.id} style={{ borderBottom: i < links.length - 1 ? `1px solid ${C.border}` : 'none' }}
                      onMouseEnter={e => e.currentTarget.style.background = C.surface2} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontSize: 13.5, fontWeight: 500, color: C.text1 }}>{link.email}</div>
                        <div style={{ fontSize: 11, fontFamily: 'monospace', color: C.text3, marginTop: 2, letterSpacing: '0.03em' }}>{link.token}</div>
                      </td>
                      <td style={{ padding: '14px 18px', fontSize: 13, color: C.text2, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getTitle(link.surveyId || link.survey_id)}</td>
                      <td style={{ padding: '14px 18px', fontSize: 15, fontWeight: 700, color: C.text1, fontFamily: 'Sora' }}>{(link.clicks||0).toLocaleString()}</td>
                      <td style={{ padding: '14px 18px', fontSize: 15, fontWeight: 700, color: C.text1, fontFamily: 'Sora' }}>{link.responses||0}</td>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 64, height: 4, background: C.border, borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{ height: '100%', background: C.accent, borderRadius: 99, width: `${conv}%`, transition: 'width 0.8s ease' }} />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 600, color: C.text2, fontFamily: 'Sora', minWidth: 30 }}>{conv}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 18px' }}><Badge status={link.status || 'active'} /></td>
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <Btn variant="accent" size="xs" onClick={() => onCopy(link.token)}>Copy Link</Btn>
                          {canManage && <Btn variant="danger" size="xs" onClick={() => onRemove(link.id)}>Delete</Btn>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {links.length === 0 && <EmptyState icon="⛓" title="No links yet" desc="Generate your first survey link to start tracking responses." />}
          </div>
        </Card>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Generate Survey Link" subtitle="Each link is uniquely tagged to the recipient's email"
        footer={<><Btn variant="secondary" onClick={() => setModal(false)}>Cancel</Btn><Btn onClick={() => { if (!form.surveyId || !form.email) return; onAdd({ ...form, id: genId(), token: genToken(), clicks: 0, responses: 0, createdAt: new Date().toISOString().slice(0,10), status: 'active' }); setModal(false); setForm({ surveyId: surveys[0]?.id || '', email: '' }); }}>Generate Link ⛓</Btn></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <SelectField label="Survey" value={form.surveyId} onChange={v => setForm(p => ({ ...p, surveyId: v }))}
            options={surveys.filter(s => s.status !== 'draft').map(s => ({ value: s.id, label: s.title }))} />
          <Input label="Recipient Email" type="email" value={form.email} onChange={v => setForm(p => ({ ...p, email: v }))} placeholder="team@department.com" required hint="Responses will be tagged to this email in the database." />
          <div style={{ padding: '12px 14px', background: C.accentLight, border: `1px solid #C7CEFF`, borderRadius: 10, fontSize: 13, color: C.accent }}>
            💡 Clicks and responses are tracked independently per link. Resume support is built in.
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── INACTIVITY ───────────────────────────────────────────────────────────────
function useInactivity(ms, onFire) {
  const t = useRef();
  const reset = useCallback(() => { clearTimeout(t.current); t.current = setTimeout(onFire, ms); }, [ms, onFire]);
  useEffect(() => {
    const evts = ['mousemove','keydown','click','scroll','touchstart'];
    evts.forEach(e => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => { evts.forEach(e => window.removeEventListener(e, reset)); clearTimeout(t.current); };
  }, [reset]);
}

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const INIT_SURVEYS = [
  {
    id: 's1', title: 'Employee Satisfaction Q4 2024', description: 'Annual engagement survey', status: 'active', createdAt: '2024-10-01', responses: 247, links: 3,
    sections: [
      { id: 'sec1', title: 'Work Environment', questions: [
        { id: 'q1', type: 'rating_star', text: 'How satisfied are you with your overall work environment?', required: true, options: [] },
        { id: 'q2', type: 'likert', text: 'My team communicates effectively.', required: true, options: LIKERT_OPTIONS },
        { id: 'q3', type: 'radio', text: 'How often do you work from home?', required: true, options: ['Never','1-2 days/week','3-4 days/week','Fully remote'] },
      ]},
      { id: 'sec2', title: 'Career Growth', questions: [
        { id: 'q4', type: 'rating_number', text: 'Rate your career growth opportunities (1–10)', required: true, options: [], settings: { min: 1, max: 10 } },
        { id: 'q5', type: 'checkbox', text: 'Which benefits do you value most?', required: false, options: ['Health Insurance','401k','Remote Work','Learning Budget','Gym Membership'] },
        { id: 'q6', type: 'text', text: 'What would make the biggest impact on your career growth here?', required: false, options: [] },
      ]},
    ]
  },
  {
    id: 's2', title: 'Product Feedback — Q4 Beta', description: 'Gather feedback from beta users', status: 'active', createdAt: '2024-09-15', responses: 89, links: 5,
    sections: [{ id: 'sec3', title: 'Product Experience', questions: [
      { id: 'q7', type: 'nps', text: 'How likely are you to recommend our product?', required: true, options: [] },
      { id: 'q8', type: 'radio', text: 'How did you hear about us?', required: true, options: ['Social Media','Word of Mouth','Search Engine','Referral'] },
      { id: 'q9', type: 'text', text: 'What feature would you most like to see added?', required: false, options: [] },
    ]}],
  },
  { id: 's3', title: 'New Hire Onboarding', description: '30-day onboarding feedback', status: 'draft', createdAt: '2024-10-10', responses: 0, links: 0, sections: [{ id: 'sec4', title: 'General', questions: [] }] },
];
const INIT_LINKS = [
  { id: 'l1', surveyId: 's1', email: 'team@dept-a.com', token: 'a1b2c3d4e5f6', clicks: 45, responses: 38, createdAt: '2024-10-01', status: 'active' },
  { id: 'l2', surveyId: 's1', email: 'team@dept-b.com', token: 'b2c3d4e5f6g7', clicks: 112, responses: 97, createdAt: '2024-10-01', status: 'active' },
  { id: 'l3', surveyId: 's2', email: 'beta@users.net',  token: 'c3d4e5f6g7h8', clicks: 203, responses: 89, createdAt: '2024-09-15', status: 'active' },
];
const INIT_USERS = [
  { id: 'u1', name: 'Alex Morgan',  email: 'admin@elevate.io',   role: 'admin',   status: 'active' },
  { id: 'u2', name: 'Jordan Lee',   email: 'creator@elevate.io', role: 'creator', status: 'active' },
  { id: 'u3', name: 'Sam Rivera',   email: 'manager@elevate.io', role: 'manager', status: 'active' },
  { id: 'u4', name: 'Casey Kim',    email: 'casey@elevate.io',   role: 'creator', status: 'inactive' },
];

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser]       = useState(null);
  const [page, setPage]       = useState('dashboard');
  const [surveys, setSurveys] = useState(INIT_SURVEYS);
  const [links, setLinks]     = useState(INIT_LINKS);
  const [users, setUsers]     = useState(INIT_USERS);
  const [editId, setEditId]   = useState(null);
  const [viewId, setViewId]   = useState(null);
  const [previewSurvey, setPreviewSurvey] = useState(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  useInactivity(INACTIVITY_MS, () => { if (user) setSessionExpired(true); });

  const nav    = (p)  => { setPage(p); setViewId(null); };
  const logout = ()   => { setUser(null); setPage('dashboard'); setSessionExpired(false); };

  if (!user) return <LoginPage onLogin={setUser} />;

  if (page === 'respond' && previewSurvey) return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      <div style={{ background: '#FEF9C3', borderBottom: `1px solid #FDE68A`, padding: '8px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: '#92400E', fontWeight: 500 }}>👁 Preview Mode — responses won't be saved</span>
        <Btn variant="secondary" size="xs" onClick={() => { setPreviewSurvey(null); nav('surveys'); }}>✕ Exit Preview</Btn>
      </div>
      <SurveyResponsePage survey={previewSurvey} token="preview" onComplete={() => { setPreviewSurvey(null); nav('surveys'); }} />
    </div>
  );

  if (page === 'builder') {
    const editing = editId ? surveys.find(s => s.id === editId) : null;
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: C.bg }}>
        <Sidebar page={page} onNav={nav} user={user} onLogout={logout} />
        <main style={{ flex: 1, overflowY: 'auto' }}>
          <SurveyBuilderPage survey={editing}
            onCancel={() => { setEditId(null); nav('surveys'); }}
            onSave={data => {
              if (editId) setSurveys(p => p.map(s => s.id === editId ? { ...s, ...data } : s));
              else setSurveys(p => [...p, { id: genId(), ...data, status: 'draft', createdAt: new Date().toISOString().slice(0, 10), responses: 0, links: 0 }]);
              setEditId(null); nav('surveys');
            }} />
        </main>
      </div>
    );
  }

  const viewSurvey = viewId ? surveys.find(s => s.id === viewId) : surveys[0];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: C.bg }}>
      <Sidebar page={page} onNav={nav} user={user} onLogout={logout} />
      <main style={{ flex: 1, overflowY: 'auto', minHeight: '100vh' }}>
        <AnimatePresence mode="wait">
          <motion.div key={page} variants={fadeIn} initial="hidden" animate="show" style={{ minHeight: '100vh', paddingTop: 8 }}>
            {page === 'dashboard' && <DashboardPage user={user} surveys={surveys} links={links} onNav={nav} />}
            {page === 'surveys'   && (
              <SurveysPage user={user} surveys={surveys}
                onNew={() => { setEditId(null); setPage('builder'); }}
                onEdit={id => { setEditId(id); setPage('builder'); }}
                onViewAnalytics={id => { setViewId(id); nav('analytics'); }}
                onToggle={id => setSurveys(p => p.map(s => s.id === id ? { ...s, status: s.status === 'active' ? 'paused' : 'active' } : s))}
                onDelete={id => { if (window.confirm('Permanently delete this survey?')) { setSurveys(p => p.filter(s => s.id !== id)); setLinks(p => p.filter(l => l.surveyId !== id)); }}}
              />
            )}
            {page === 'analytics' && <AnalyticsPage survey={viewSurvey} />}
            {page === 'users'     && user.role === 'admin' && (
              <UsersPage users={users}
                onAdd={u => setUsers(p => [...p, u])}
                onUpdate={(id, upd) => setUsers(p => p.map(u => u.id === id ? { ...u, ...upd } : u))}
                onRemove={id => setUsers(p => p.filter(u => u.id !== id))}
              />
            )}
            {page === 'links'     && (
              <LinksPage user={user} surveys={surveys} links={links}
                onAdd={l => { setLinks(p => [...p, l]); setSurveys(p => p.map(s => s.id === l.surveyId ? { ...s, links: (s.links || 0) + 1 } : s)); }}
                onRemove={id => setLinks(p => p.filter(l => l.id !== id))}
                onCopy={token => { const url = `${location.origin}/survey/${token}`; navigator.clipboard.writeText(url).then(() => alert('✅ Link copied!')).catch(() => prompt('Copy:', url)); }}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Session expired */}
      <Modal open={sessionExpired} onClose={() => {}} title="Session Expired" subtitle="You were signed out for security after 15 min of inactivity."
        footer={<Btn onClick={logout} style={{ width: '100%' }}>Sign In Again →</Btn>}>
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>⏰</div>
          <p style={{ fontSize: 14, color: C.text2 }}>Any in-progress survey responses were auto-saved and can be resumed via the original link.</p>
        </div>
      </Modal>
    </div>
  );
}