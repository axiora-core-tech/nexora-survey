import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import useAuthStore from '../hooks/useAuth';
import { hasPermission } from '../lib/constants';
import toast from 'react-hot-toast';

// ── Static actions ────────────────────────────────────────────────────────────
const STATIC_ACTIONS = [
  { id: 'nav-dashboard',  label: 'Go to Dashboard',    icon: '⌂', group: 'Navigate', to: '/dashboard' },
  { id: 'nav-surveys',    label: 'Go to Surveys',       icon: '📋', group: 'Navigate', to: '/surveys' },
  { id: 'nav-analytics',  label: 'Go to Analytics',     icon: '📊', group: 'Navigate', to: '/surveys' },
  { id: 'nav-team',       label: 'Go to Team',          icon: '👥', group: 'Navigate', to: '/team', perm: 'manage_team' },
  { id: 'nav-settings',   label: 'Go to Settings',      icon: '⚙',  group: 'Navigate', to: '/settings' },
  { id: 'new-survey',     label: 'Create New Survey',   icon: '✦',  group: 'Actions',  to: '/surveys/new', perm: 'create_survey' },
];

export default function CommandPalette({ onClose }) {
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const nav = useNavigate();
  const { profile } = useAuthStore();

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  // ── Search ────────────────────────────────────────────────────────────────
  const search = useCallback(async (q) => {
    const trimmed = q.trim().toLowerCase();

    // Filter static actions
    const staticFiltered = STATIC_ACTIONS.filter(a => {
      if (a.perm && !hasPermission(profile?.role, a.perm)) return false;
      return !trimmed || a.label.toLowerCase().includes(trimmed) || a.group.toLowerCase().includes(trimmed);
    });

    if (!trimmed) {
      setResults(staticFiltered.slice(0, 8));
      setSelected(0);
      return;
    }

    setLoading(true);
    try {
      const { data: surveys } = await supabase
        .from('surveys')
        .select('id, title, status, slug')
        .ilike('title', `%${trimmed}%`)
        .limit(5);

      const surveyActions = (surveys || []).flatMap(sv => [
        { id: `sv-edit-${sv.id}`,     label: sv.title,             icon: '📝', group: 'Surveys', to: `/surveys/${sv.id}/edit`,      meta: sv.status },
        { id: `sv-analytics-${sv.id}`, label: `${sv.title} — Analytics`, icon: '📊', group: 'Surveys', to: `/surveys/${sv.id}/analytics` },
      ]);

      const combined = [...staticFiltered, ...surveyActions].slice(0, 10);
      setResults(combined);
      setSelected(0);
    } catch (e) {
      setResults(staticFiltered);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    const t = setTimeout(() => search(query), 120);
    return () => clearTimeout(t);
  }, [query, search]);

  // ── Keyboard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = e => {
      if (e.key === 'ArrowDown')  { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)); }
      if (e.key === 'ArrowUp')    { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
      if (e.key === 'Enter')      { e.preventDefault(); execute(results[selected]); }
      if (e.key === 'Escape')     onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [results, selected]);

  function execute(item) {
    if (!item) return;
    nav(item.to);
    onClose();
  }

  // Group results
  const grouped = results.reduce((acc, item, idx) => {
    const g = item.group;
    if (!acc[g]) acc[g] = [];
    acc[g].push({ ...item, _idx: idx });
    return acc;
  }, {});

  const statusColor = { active: 'var(--sage)', draft: 'rgba(22,15,8,0.3)', paused: 'var(--saffron)', expired: 'var(--terracotta)', closed: 'var(--terracotta)' };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      style={{ position: 'fixed', inset: 0, zIndex: 9500, background: 'rgba(22,15,8,0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '12vh', padding: '12vh 24px 24px' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, y: -16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.98 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        style={{ width: '100%', maxWidth: 580, background: 'var(--warm-white)', borderRadius: 20, boxShadow: '0 40px 100px rgba(22,15,8,0.35)', overflow: 'hidden', border: '1px solid rgba(22,15,8,0.06)' }}
      >
        {/* Search input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid rgba(22,15,8,0.07)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(22,15,8,0.35)" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search surveys, navigate, or take action…"
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontFamily: 'Fraunces, serif', fontSize: 16, fontWeight: 300, color: 'var(--espresso)', caretColor: 'var(--coral)' }}
          />
          {loading && (
            <div style={{ width: 14, height: 14, border: '2px solid rgba(22,15,8,0.1)', borderTopColor: 'var(--coral)', borderRadius: '50%', animation: 'nx-spin 0.6s linear infinite' }} />
          )}
          <kbd style={{ fontFamily: 'Syne, sans-serif', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', padding: '3px 7px', borderRadius: 6, background: 'var(--cream-deep)', color: 'rgba(22,15,8,0.4)', border: '1px solid rgba(22,15,8,0.08)' }}>ESC</kbd>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 380, overflowY: 'auto', padding: '8px 8px' }}>
          {results.length === 0 && !loading && (
            <div style={{ padding: '32px 20px', textAlign: 'center', fontFamily: 'Fraunces, serif', fontWeight: 300, fontSize: 14, color: 'rgba(22,15,8,0.35)' }}>
              No results for "{query}"
            </div>
          )}
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 9, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(22,15,8,0.3)', padding: '8px 12px 4px' }}>
                {group}
              </div>
              {items.map(item => (
                <button
                  key={item.id}
                  onClick={() => execute(item)}
                  onMouseEnter={() => setSelected(item._idx)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px', borderRadius: 10, border: 'none',
                    background: selected === item._idx ? 'var(--espresso)' : 'transparent',
                    cursor: 'pointer', textAlign: 'left', transition: 'background 0.12s',
                  }}
                >
                  <span style={{ fontSize: 16, width: 24, textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
                  <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 12, fontWeight: 600, color: selected === item._idx ? 'var(--cream)' : 'var(--espresso)', flex: 1, letterSpacing: '0.02em' }}>
                    {item.label}
                  </span>
                  {item.meta && (
                    <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: selected === item._idx ? 'rgba(253,245,232,0.4)' : statusColor[item.meta] || 'rgba(22,15,8,0.3)', flexShrink: 0 }}>
                      {item.meta}
                    </span>
                  )}
                  <kbd style={{ fontFamily: 'Syne, sans-serif', fontSize: 9, padding: '2px 6px', borderRadius: 5, background: selected === item._idx ? 'rgba(253,245,232,0.12)' : 'var(--cream-deep)', color: selected === item._idx ? 'rgba(253,245,232,0.5)' : 'rgba(22,15,8,0.3)', border: `1px solid ${selected === item._idx ? 'rgba(253,245,232,0.1)' : 'rgba(22,15,8,0.08)'}`, flexShrink: 0 }}>↵</kbd>
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div style={{ padding: '10px 20px', borderTop: '1px solid rgba(22,15,8,0.06)', display: 'flex', gap: 16 }}>
          {[['↑↓', 'Navigate'], ['↵', 'Open'], ['Esc', 'Close']].map(([key, label]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <kbd style={{ fontFamily: 'Syne, sans-serif', fontSize: 9, padding: '2px 7px', borderRadius: 5, background: 'var(--cream-deep)', color: 'rgba(22,15,8,0.4)', border: '1px solid rgba(22,15,8,0.08)' }}>{key}</kbd>
              <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 9, fontWeight: 600, color: 'rgba(22,15,8,0.3)', letterSpacing: '0.08em' }}>{label}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
