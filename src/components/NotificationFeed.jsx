import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { timeAgo } from '../lib/constants';
import useAuthStore from '../hooks/useAuth';

export default function NotificationFeed() {
  const [open, setOpen]         = useState(false);
  const [events, setEvents]     = useState([]);
  const [unread, setUnread]     = useState(0);
  const [loading, setLoading]   = useState(false);
  const ref = useRef(null);
  const nav = useNavigate();
  const { profile } = useAuthStore();

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setClose(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  function setClose() { setOpen(false); }

  // Load events
  async function load() {
    if (!profile?.tenant_id) return;
    setLoading(true);
    try {
      // Pull recent responses + survey status changes as a synthetic feed
      const { data: responses } = await supabase
        .from('survey_responses')
        .select('id, created_at, status, survey:surveys!survey_id(id, title)')
        .eq('surveys.tenant_id', profile.tenant_id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(8);

      const { data: surveys } = await supabase
        .from('surveys')
        .select('id, title, status, created_at, updated_at')
        .eq('tenant_id', profile.tenant_id)
        .order('updated_at', { ascending: false })
        .limit(5);

      const feed = [
        ...(responses || []).filter(r => r.survey).map(r => ({
          id: `resp-${r.id}`,
          type: 'response',
          icon: 'inbox',
          text: `New response on "${r.survey?.title}"`,
          time: r.created_at,
          to: `/surveys/${r.survey?.id}/analytics`,
        })),
        ...(surveys || []).map(s => ({
          id: `sv-${s.id}`,
          type: 'survey',
          icon: s.status === 'active' ? 'active' : s.status === 'paused' ? 'paused' : 'survey',
          text: s.status === 'active' ? `"${s.title}" is live` : s.status === 'paused' ? `"${s.title}" was paused` : `"${s.title}" created`,
          time: s.updated_at || s.created_at,
          to: `/surveys/${s.id}/edit`,
        })),
      ]
        .sort((a, b) => new Date(b.time) - new Date(a.time))
        .slice(0, 10);

      setEvents(feed);
      setUnread(feed.slice(0, 3).length); // treat newest 3 as "unread" until opened
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [profile?.tenant_id]);

  // Realtime: new completed responses
  useEffect(() => {
    if (!profile?.tenant_id) return;
    const channel = supabase
      .channel('np-notifications')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'survey_responses',
        filter: `status=eq.completed`,
      }, () => { load(); })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [profile?.tenant_id]);

  function handleOpen() {
    setOpen(o => !o);
    if (!open) setUnread(0);
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        aria-label="Notifications"
        style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: 6, color: open ? 'var(--espresso)' : 'rgba(22,15,8,0.4)', fontSize: 18, lineHeight: 1, transition: 'color 0.2s', display: 'flex', alignItems: 'center' }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--espresso)'}
        onMouseLeave={e => !open && (e.currentTarget.style.color = 'rgba(22,15,8,0.4)')}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        {unread > 0 && (
          <motion.span
            initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            style={{ position: 'absolute', top: 2, right: 2, width: 16, height: 16, background: 'var(--coral)', borderRadius: '50%', border: '2px solid var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 8, color: '#fff', lineHeight: 1 }}
          >
            {unread}
          </motion.span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            style={{ position: 'absolute', right: 0, top: 44, zIndex: 500, width: 320, background: 'var(--warm-white)', borderRadius: 18, boxShadow: '0 24px 80px rgba(22,15,8,0.2)', border: '1px solid rgba(22,15,8,0.07)', overflow: 'hidden' }}
          >
            <div style={{ padding: '16px 18px 10px', borderBottom: '1px solid rgba(22,15,8,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--espresso)' }}>Activity</span>
              <button onClick={load} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Syne, sans-serif', fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(22,15,8,0.35)', transition: 'color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--coral)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(22,15,8,0.35)'}>
                ↺ Refresh
              </button>
            </div>

            <div style={{ maxHeight: 360, overflowY: 'auto' }}>
              {loading && (
                <div style={{ padding: 24, textAlign: 'center', fontFamily: 'Fraunces, serif', fontWeight: 300, fontSize: 13, color: 'rgba(22,15,8,0.35)' }}>Loading…</div>
              )}
              {!loading && events.length === 0 && (
                <div style={{ padding: '32px 24px', textAlign: 'center' }}>
                  <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'center', color: 'rgba(22,15,8,0.2)' }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 17.24 4H6.76a2 2 0 0 0-1.79 1.11z"/></svg>
                  </div>
                  <p style={{ fontFamily: 'Fraunces, serif', fontWeight: 300, fontSize: 13, color: 'rgba(22,15,8,0.4)', margin: 0 }}>No activity yet</p>
                </div>
              )}
              {!loading && events.map((ev, i) => {
                const iconEl = ev.icon === 'inbox'
                  ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 17.24 4H6.76a2 2 0 0 0-1.79 1.11z"/></svg>
                  : ev.icon === 'active'
                  ? <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M5 3l14 9-14 9V3z"/></svg>
                  : ev.icon === 'paused'
                  ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="5" x2="8" y2="19"/><line x1="16" y1="5" x2="16" y2="19"/></svg>
                  : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M9 7h6M9 11h6M9 15h4"/></svg>;
                return (
                  <button key={ev.id} onClick={() => { nav(ev.to); setClose(); }}
                    style={{ width: '100%', display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 18px', background: i < unread ? 'rgba(255,69,0,0.03)' : 'none', border: 'none', borderBottom: '1px solid rgba(22,15,8,0.05)', cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(22,15,8,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = i < unread ? 'rgba(255,69,0,0.03)' : 'none'}
                  >
                    <span style={{ width: 20, height: 20, borderRadius: 6, background: 'rgba(22,15,8,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1, color: 'rgba(22,15,8,0.45)' }}>{iconEl}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: 'Fraunces, serif', fontWeight: 300, fontSize: 13, color: 'var(--espresso)', margin: '0 0 3px', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.text}</p>
                      <span style={{ fontFamily: 'Syne, sans-serif', fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', color: 'rgba(22,15,8,0.35)' }}>{timeAgo(ev.time)}</span>
                    </div>
                    {i < 3 && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--coral)', flexShrink: 0, marginTop: 5 }} />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
