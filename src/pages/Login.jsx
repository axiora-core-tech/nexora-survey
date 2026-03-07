import React, { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import useAuthStore from '../hooks/useAuth';
import toast from 'react-hot-toast';

const Logo = ({ dark }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, lineHeight: 1 }}>
    <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: dark ? 'rgba(253,245,232,0.35)' : 'rgba(22,15,8,0.35)', marginRight: 8, position: 'relative', top: -2 }}>Nexora</span>
    <span style={{ fontFamily: 'Playfair Display, serif', fontWeight: 900, fontSize: 24, letterSpacing: '-1px', color: dark ? 'var(--cream)' : 'var(--espresso)', lineHeight: 1 }}>Pulse</span>
    <div style={{ position: 'relative', width: 9, height: 9, background: 'var(--coral)', borderRadius: '50%', boxShadow: '0 0 10px rgba(255,69,0,0.55)', alignSelf: 'flex-start', marginTop: 5, marginLeft: 8, flexShrink: 0 }}>
      <div className="sonar-ring" /><div className="sonar-ring" /><div className="sonar-ring" />
    </div>
  </div>
);

export default function Login() {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const { signIn, user, initialized } = useAuthStore();
  const nav = useNavigate();

  // BUG FIX: Redirect already-authenticated users away from the login page.
  // Previously a logged-in user could navigate to /login and see the form.
  if (initialized && user) return <Navigate to="/dashboard" replace />;

  const go = async e => {
    e.preventDefault();
    if (!email || !pw) return toast.error('Fill in all fields');
    setBusy(true);
    try { await signIn(email, pw); toast.success('Welcome back!'); nav('/dashboard'); }
    catch (e) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1fr 480px' }}>

      {/* ── LEFT: dark editorial panel ── */}
      <div style={{ background: 'var(--espresso)', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '80px 72px', overflow: 'hidden' }}>
        {/* Mesh blobs */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', filter: 'blur(80px)', background: 'radial-gradient(circle,rgba(255,69,0,0.35),transparent 70%)', top: -150, right: -150 }} />
          <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', filter: 'blur(80px)', background: 'radial-gradient(circle,rgba(255,184,0,0.2),transparent 70%)', bottom: -100, left: -100 }} />
        </div>
        {/* Grain */}
        <div className="grain" style={{ opacity: 0.035 }} />
        {/* Ghost text */}
        <div style={{ position: 'absolute', bottom: -30, left: -10, fontFamily: 'Playfair Display, serif', fontWeight: 900, fontSize: 'clamp(120px,15vw,220px)', color: 'transparent', WebkitTextStroke: '1px rgba(253,245,232,0.04)', letterSpacing: -5, lineHeight: 1, userSelect: 'none', pointerEvents: 'none' }}>Pulse</div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Logo */}
          <div style={{ marginBottom: 72 }}><Logo dark /></div>

          {/* Headline */}
          <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 'clamp(34px,3.5vw,50px)', fontWeight: 900, lineHeight: 1.05, letterSpacing: '-1.5px', color: 'var(--cream)', marginBottom: 24 }}>
            Research that{' '}
            <em style={{ fontStyle: 'italic', color: 'var(--saffron)' }}>holds up</em>
            {' '}in a room.
          </h2>

          <p style={{ fontFamily: 'Fraunces, serif', fontSize: 17, fontWeight: 300, lineHeight: 1.7, color: 'rgba(253,245,232,0.5)', maxWidth: 380, marginBottom: 60 }}>
            Trusted by insight leads at India's largest FMCG, financial, and consumer brands.
          </p>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 40 }}>
            {[{ val: '2.4', unit: 'k', lbl: 'Research teams' }, { val: '84', unit: '%', lbl: 'Median incidence' }, { val: '4.9', unit: '★', lbl: 'Practitioner rating' }].map(s => (
              <div key={s.lbl}>
                <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 32, fontWeight: 900, color: 'var(--cream)', lineHeight: 1 }}>
                  {s.val}<span style={{ color: 'var(--saffron)' }}>{s.unit}</span>
                </div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(253,245,232,0.3)', marginTop: 4 }}>{s.lbl}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT: form panel ── */}
      <div style={{ background: 'var(--warm-white)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 56px', borderLeft: '1px solid rgba(22,15,8,0.06)' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={{ width: '100%', maxWidth: 340 }}>
          <Link to="/" style={{ textDecoration: 'none', display: 'block', marginBottom: 48 }}><Logo dark={false} /></Link>

          <h2 style={{ fontFamily: 'Playfair Display, serif', fontWeight: 900, fontSize: 32, letterSpacing: '-1px', color: 'var(--espresso)', marginBottom: 8 }}>Sign in</h2>
          <p style={{ fontFamily: 'Fraunces, serif', fontWeight: 300, fontSize: 16, color: 'rgba(22,15,8,0.45)', marginBottom: 40 }}>Enter your credentials to continue</p>

          <form onSubmit={go} style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {[
              { label: 'Email', type: 'email', val: email, set: setEmail, ph: 'you@company.com' },
              { label: 'Password', type: 'password', val: pw, set: setPw, ph: '••••••••' },
            ].map(f => (
              <div key={f.label}>
                <label style={{ fontFamily: 'Syne, sans-serif', fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(22,15,8,0.4)', display: 'block', marginBottom: 10 }}>{f.label}</label>
                <input type={f.type} value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '0 0 12px', background: 'transparent', border: 'none', borderBottom: '2px solid rgba(22,15,8,0.12)', fontFamily: 'Fraunces, serif', fontSize: 17, color: 'var(--espresso)', outline: 'none', transition: 'border-color 0.2s' }}
                  onFocus={e => e.target.style.borderBottomColor = 'var(--coral)'}
                  onBlur={e => e.target.style.borderBottomColor = 'rgba(22,15,8,0.12)'}
                />
              </div>
            ))}

            <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
              type="submit" disabled={busy}
              style={{ marginTop: 8, padding: '16px 28px', background: busy ? 'rgba(22,15,8,0.4)' : 'var(--espresso)', color: 'var(--cream)', border: 'none', borderRadius: 999, fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: busy ? 'not-allowed' : 'pointer', transition: 'background 0.25s ease' }}
              onMouseEnter={e => { if (!busy) e.currentTarget.style.background = 'var(--coral)'; }}
              onMouseLeave={e => { if (!busy) e.currentTarget.style.background = 'var(--espresso)'; }}>
              {busy ? 'Signing in…' : 'Sign in →'}
            </motion.button>
          </form>

          <p style={{ fontFamily: 'Fraunces, serif', fontWeight: 300, fontSize: 14, color: 'rgba(22,15,8,0.4)', marginTop: 40, textAlign: 'center' }}>
            No account?{' '}
            <Link to="/register" style={{ color: 'var(--espresso)', fontWeight: 500, textDecoration: 'none', borderBottom: '1px solid rgba(22,15,8,0.2)', paddingBottom: 1, transition: 'color 0.2s, border-color 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--coral)'; e.currentTarget.style.borderBottomColor = 'var(--coral)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--espresso)'; e.currentTarget.style.borderBottomColor = 'rgba(22,15,8,0.2)'; }}>
              Create one →
            </Link>
          </p>
        </motion.div>
      </div>

      {/* Responsive: stack on mobile */}
      <style>{`
        @media (max-width: 900px) {
          div[style*="gridTemplateColumns: '1fr 480px'"] {
            grid-template-columns: 1fr !important;
          }
          div[style*="padding: '80px 72px'"] { display: none !important; }
        }
      `}</style>
    </div>
  );
}
