import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../hooks/useAuth';
import { hasPermission, ROLE_LABELS } from '../lib/constants';

// Nav items — Settings removed (lives in avatar menu now)
const NAV = [
  { to: '/dashboard',   label: 'Overview'  },
  { to: '/surveys',     label: 'Surveys'   },
  { to: '/surveys/new', label: 'New',       perm: 'create_survey', exact: true },
  { to: '/team',        label: 'Team',      perm: 'manage_team' },
];

export default function DashboardLayout() {
  const { profile, tenant, signOut } = useAuthStore();
  const [userMenu, setUserMenu]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const nav = useNavigate();
  const loc = useLocation();

  // ── Custom cursor (issue #7) ─────────────────────────────────
  const cursorRef = useRef(null);
  const ringRef   = useRef(null);
  const mouse     = useRef({ x: 0, y: 0 });
  const ring      = useRef({ x: 0, y: 0 });
  const raf       = useRef(null);

  useEffect(() => {
    const dot  = cursorRef.current;
    const rng  = ringRef.current;
    if (!dot || !rng) return;

    const move = e => {
      mouse.current = { x: e.clientX, y: e.clientY };
      dot.style.transform = `translate(${e.clientX}px,${e.clientY}px)`;
    };

    const loop = () => {
      ring.current.x += (mouse.current.x - ring.current.x) * 0.12;
      ring.current.y += (mouse.current.y - ring.current.y) * 0.12;
      rng.style.transform = `translate(${ring.current.x}px,${ring.current.y}px)`;
      raf.current = requestAnimationFrame(loop);
    };

    const over  = () => document.body.classList.add('np-hovering');
    const out   = () => document.body.classList.remove('np-hovering');
    const down  = () => document.body.classList.add('np-clicking');
    const up    = () => document.body.classList.remove('np-clicking');

    window.addEventListener('mousemove', move);
    document.querySelectorAll('a,button,[role=button]').forEach(el => {
      el.addEventListener('mouseenter', over);
      el.addEventListener('mouseleave', out);
    });
    window.addEventListener('mousedown', down);
    window.addEventListener('mouseup', up);
    raf.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mousedown', down);
      window.removeEventListener('mouseup', up);
      cancelAnimationFrame(raf.current);
    };
  }, []);

  const items = NAV.filter(n => !n.perm || hasPermission(profile?.role, n.perm));
  const initials = (profile?.full_name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  // Issue #3: precise active state — Surveys active everywhere under /surveys EXCEPT /surveys/new
  function isNavActive(item) {
    if (item.exact) return loc.pathname === item.to;
    if (item.to === '/surveys') return loc.pathname.startsWith('/surveys') && loc.pathname !== '/surveys/new';
    if (item.to === '/dashboard') return loc.pathname === '/dashboard';
    return loc.pathname.startsWith(item.to);
  }

  async function handleSignOut() {
    await signOut(); nav('/login'); setUserMenu(false);
  }

  const menuItemStyle = (danger) => ({
    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 12px', borderRadius: 10, border: 'none',
    background: 'transparent', cursor: 'pointer',
    fontFamily: 'Syne, sans-serif', fontSize: 10, fontWeight: 700,
    letterSpacing: '0.12em', textTransform: 'uppercase',
    color: danger ? 'rgba(214,59,31,0.7)' : 'rgba(253,245,232,0.45)',
    transition: 'all 0.2s', textDecoration: 'none',
  });

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', cursor: 'none' }}>

      {/* ── Custom cursor ── */}
      <div ref={cursorRef} id="np-cursor-dot" style={{ position: 'fixed', top: 0, left: 0, zIndex: 9999, pointerEvents: 'none', willChange: 'transform' }}>
        <div style={{ width: 6, height: 6, background: 'var(--coral)', borderRadius: '50%', position: 'absolute', transform: 'translate(-50%,-50%)', boxShadow: '0 0 0 2px rgba(255,255,255,.8),0 0 0 3.5px rgba(255,69,0,.18)', transition: 'width .15s,height .15s' }} />
      </div>
      <div ref={ringRef} id="np-cursor-ring" style={{ position: 'fixed', top: 0, left: 0, zIndex: 9998, pointerEvents: 'none', willChange: 'transform' }}>
        <div style={{ width: 30, height: 30, borderRadius: '50%', position: 'absolute', transform: 'translate(-50%,-50%)', boxShadow: '0 0 0 1px rgba(22,15,8,.15),0 0 0 2px rgba(255,255,255,.3)', opacity: .5, transition: 'width .3s,height .3s,opacity .3s' }} />
      </div>

      {/* ── STICKY TOP NAV ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 200,
        background: 'rgba(253,245,232,0.92)', backdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(22,15,8,0.07)',
        height: 64, padding: '0 48px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        {/* Logo with sonar dot (issue #4) */}
        <NavLink to="/dashboard" style={{ textDecoration: 'none', display: 'flex', alignItems: 'flex-start', gap: 0, lineHeight: 1 }}>
          <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(22,15,8,0.35)', marginRight: 8, position: 'relative', top: -2 }}>Nexora</span>
          <span style={{ fontFamily: 'Playfair Display, serif', fontWeight: 900, fontSize: 22, letterSpacing: '-1px', color: 'var(--espresso)', lineHeight: 1 }}>Pulse</span>
          <div style={{ position: 'relative', width: 9, height: 9, background: 'var(--coral)', borderRadius: '50%', boxShadow: '0 0 10px rgba(255,69,0,0.55)', alignSelf: 'flex-start', marginTop: 5, marginLeft: 8, flexShrink: 0 }}>
            <div className="sonar-ring" /><div className="sonar-ring" /><div className="sonar-ring" />
          </div>
        </NavLink>

        {/* Desktop nav */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 2 }} className="np-desktop-nav">
          {items.map(n => {
            const active = isNavActive(n);
            return (
              <NavLink key={n.to} to={n.to}
                style={{ fontFamily: 'Syne, sans-serif', fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', textDecoration: 'none', padding: '7px 16px', borderRadius: 999, background: active ? 'var(--espresso)' : 'transparent', color: active ? 'var(--cream)' : 'rgba(22,15,8,0.4)', transition: 'all 0.2s ease' }}>
                {n.label}
              </NavLink>
            );
          })}
        </nav>

        {/* Right: org + avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          {tenant && <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(22,15,8,0.25)' }} className="np-desktop-nav">{tenant.name}</span>}

          <div style={{ position: 'relative' }}>
            <button onClick={() => setUserMenu(v => !v)}
              style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--espresso)', color: 'var(--cream)', border: 'none', cursor: 'none', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--coral)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--espresso)'}>
              {initials}
            </button>

            <AnimatePresence>
              {userMenu && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 10 }} onClick={() => setUserMenu(false)} />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -6 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -6 }}
                    transition={{ duration: 0.15 }}
                    style={{ position: 'absolute', right: 0, top: 42, zIndex: 20, width: 240, background: 'var(--espresso)', borderRadius: 18, padding: 14, boxShadow: '0 24px 80px rgba(22,15,8,0.3)' }}>

                    {/* User info */}
                    <div style={{ padding: '8px 8px 14px', borderBottom: '1px solid rgba(253,245,232,0.08)', marginBottom: 8 }}>
                      <div style={{ fontFamily: 'Playfair Display, serif', fontWeight: 700, fontSize: 15, color: 'var(--cream)', marginBottom: 2 }}>{profile?.full_name}</div>
                      <div style={{ fontFamily: 'Fraunces, serif', fontWeight: 300, fontSize: 12, color: 'rgba(253,245,232,0.4)', marginBottom: 8 }}>{profile?.email}</div>
                      <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', padding: '4px 10px', borderRadius: 999, background: 'rgba(255,69,0,0.15)', color: 'var(--coral)' }}>
                        {ROLE_LABELS[profile?.role]}
                      </span>
                    </div>

                    {/* Issue #1: Settings in avatar menu */}
                    <Link to="/settings" onClick={() => setUserMenu(false)}
                      style={menuItemStyle(false)}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(253,245,232,0.08)'; e.currentTarget.style.color = 'var(--cream)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(253,245,232,0.45)'; }}>
                      ⚙ Settings
                    </Link>

                    {/* Issue #2: Reset password link */}
                    <Link to="/reset-password" onClick={() => setUserMenu(false)}
                      style={menuItemStyle(false)}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(253,245,232,0.08)'; e.currentTarget.style.color = 'var(--cream)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(253,245,232,0.45)'; }}>
                      🔑 Reset password
                    </Link>

                    <div style={{ borderTop: '1px solid rgba(253,245,232,0.08)', marginTop: 4, paddingTop: 4 }}>
                      <button onClick={handleSignOut} style={menuItemStyle(true)}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(214,59,31,0.15)'; e.currentTarget.style.color = 'var(--terracotta)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(214,59,31,0.7)'; }}>
                        ↩ Sign out
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <button onClick={() => setMobileOpen(v => !v)} className="np-mobile-nav"
            style={{ background: 'none', border: 'none', cursor: 'none', padding: 6, color: 'var(--espresso)', fontSize: 20, lineHeight: 1 }}>
            {mobileOpen ? '✕' : '☰'}
          </button>
        </div>
      </header>

      {/* Mobile nav */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            style={{ background: 'var(--espresso)', overflow: 'hidden', position: 'relative', zIndex: 100 }}>
            <div style={{ padding: '12px 24px 20px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {items.map(n => {
                const active = isNavActive(n);
                return (
                  <NavLink key={n.to} to={n.to} onClick={() => setMobileOpen(false)}
                    style={{ fontFamily: 'Syne, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', textDecoration: 'none', padding: '12px 16px', borderRadius: 10, background: active ? 'rgba(255,69,0,0.15)' : 'transparent', color: active ? 'var(--coral)' : 'rgba(253,245,232,0.45)' }}>
                    {n.label}
                  </NavLink>
                );
              })}
              <NavLink to="/settings" onClick={() => setMobileOpen(false)}
                style={({ isActive }) => ({ fontFamily: 'Syne, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', textDecoration: 'none', padding: '12px 16px', borderRadius: 10, background: isActive ? 'rgba(255,69,0,0.15)' : 'transparent', color: isActive ? 'var(--coral)' : 'rgba(253,245,232,0.45)' })}>
                Settings
              </NavLink>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page content */}
      <main style={{ maxWidth: 1320, margin: '0 auto', padding: '52px 48px 40px', width: '100%', boxSizing: 'border-box' }}>
        <Outlet />
      </main>

      {/* Issue #6: Footer */}
      <footer style={{ maxWidth: 1320, margin: '0 auto', padding: '24px 48px 40px', width: '100%', boxSizing: 'border-box', borderTop: '1px solid rgba(22,15,8,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: 'Syne, sans-serif', fontSize: 10, fontWeight: 600, letterSpacing: '0.1em', color: 'rgba(22,15,8,0.25)', textAlign: 'center', margin: 0 }}>
          © 2026 Nexora Pulse is a product of Axiora Labs · Built for researchers, by researchers · Hyderabad
        </p>
      </footer>

      <style>{`
        /* Cursor states */
        .np-hovering  #np-cursor-dot  > div { width: 5px !important; height: 5px !important; }
        .np-hovering  #np-cursor-ring > div { width: 44px !important; height: 44px !important; opacity: .3 !important; }
        .np-clicking  #np-cursor-dot  > div { width: 4px !important; height: 4px !important; }
        .np-clicking  #np-cursor-ring > div { width: 20px !important; height: 20px !important; opacity: .7 !important; }

        /* Responsive */
        @media (max-width: 768px) {
          .np-desktop-nav { display: none !important; }
          .np-mobile-nav  { display: flex !important; }
          main, footer { padding-left: 20px !important; padding-right: 20px !important; }
          header { padding: 0 20px !important; }
        }
        @media (min-width: 769px) {
          .np-mobile-nav { display: none !important; }
        }

        /* Hide system cursor everywhere inside app */
        * { cursor: none !important; }
      `}</style>
    </div>
  );
}
